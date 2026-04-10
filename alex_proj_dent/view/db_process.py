class process_db_ora_mysql:
    def __init__(self):
        from django.conf import settings
        from django.db import connection

        self.connection = connection
        self.cursor = connection.cursor()

        engine = settings.DATABASES['default']['ENGINE'].lower()

        if 'oracle' in engine:
            self.db_type = 'oracle'
            self.is_oracle = True
            self.is_mysql = False
            self.is_pg = False
        elif 'mysql' in engine:
            self.db_type = 'mysql'
            self.is_oracle = False
            self.is_mysql = True
            self.is_pg = False
        elif 'postgresql' in engine:
            self.db_type = 'postgresql'
            self.is_oracle = False
            self.is_mysql = False
            self.is_pg = True
        else:
            raise ValueError(f"Unsupported DB engine: {engine}")

    # ============================================================
    # Helper: Fix table name for PostgreSQL (حل عام)
    # ============================================================
    def _fix_table_name(self, table_name):
        """إضافة اسم المخطط والحفاظ على حالة الأحرف لـ PostgreSQL"""
        if not self.is_pg:
            return table_name
        
        # إذا كان الاسم يحتوي بالفعل على مخطط أو بين علامات تنصيص
        if '.' in table_name or table_name.startswith('"'):
            return table_name
        
        # تحويل اسم الجدول إلى أحرف كبيرة وإضافة المخطط مع علامات تنصيص
        return f'"ALEX_DENT"."{table_name.upper()}"'

    # ============================================================
    # Helper: Quote column names in WHERE clause for PostgreSQL only
    # ============================================================
    def _quote_columns(self, condition):
        """إضافة علامات تنصيص لأسماء الأعمدة - فقط لـ PostgreSQL"""
        if not self.is_pg or not condition:
            return condition
        
        import re
        # إضافة علامات تنصيص لأسماء الأعمدة (كلمات بحروف كبيرة قبل = أو > أو < أو LIKE)
        return re.sub(r'\b([A-Z][A-Z0-9_]*)\b\s*(?=[=<>]|\s+LIKE\s+|\s+IN\s+\()', r'"\1"', condition)

    # ============================================================
    # TYPE MAPPING
    # ============================================================
    def _map_column_type(self, col_type):
        col_type = col_type.upper()
        if self.is_oracle:
            mapping = {
                "INT": "NUMBER",
                "INTEGER": "NUMBER",
                "BIGINT": "NUMBER(19)",
                "VARCHAR": "VARCHAR2(255)",
                "TEXT": "CLOB",
                "DATE": "DATE",
                "DATETIME": "DATE",
                "FLOAT": "FLOAT",
                "DOUBLE": "FLOAT",
                "BOOLEAN": "NUMBER(1)",
            }
        elif self.is_mysql:
            mapping = {
                "INT": "INT",
                "INTEGER": "INT",
                "BIGINT": "BIGINT",
                "VARCHAR": "VARCHAR(255)",
                "TEXT": "TEXT",
                "DATE": "DATE",
                "DATETIME": "DATETIME",
                "FLOAT": "FLOAT",
                "DOUBLE": "DOUBLE",
                "BOOLEAN": "BOOLEAN",
            }
        elif self.is_pg:
            mapping = {
                "INT": "INTEGER",
                "INTEGER": "INTEGER",
                "BIGINT": "BIGINT",
                "VARCHAR": "VARCHAR(255)",
                "TEXT": "TEXT",
                "DATE": "DATE",
                "DATETIME": "TIMESTAMP",
                "FLOAT": "REAL",
                "DOUBLE": "DOUBLE PRECISION",
                "BOOLEAN": "BOOLEAN",
            }
        else:
            mapping = {}
        return mapping.get(col_type, col_type)

    # ============================================================
    # EXECUTE BULK
    # ============================================================
    def execute_bulk(self, tramo):
        success = []
        select_results = {}

        try:
            for table_name, actions in tramo.items():
                # تطبيق إصلاح اسم الجدول (لـ PostgreSQL فقط)
                fixed_table_name = self._fix_table_name(table_name)
                
                for action in actions:
                    # نسخ action وتحديث اسم الجدول
                    action_copy = action.copy() if isinstance(action, dict) else action

                    if action_copy.get("create") and "columns" in action_copy:
                        self._create_table(fixed_table_name, action_copy)
                    elif action_copy.get("delete"):
                        self._delete(fixed_table_name, action_copy)
                    elif action_copy.get("insert"):
                        self._insert(fixed_table_name, action_copy)
                    elif action_copy.get("update"):
                        self._update(fixed_table_name, action_copy)
                    elif action_copy.get("select"):
                        result = self._select(fixed_table_name, action_copy)
                        select_results[table_name] = result  # نحتفظ بالاسم الأصلي في النتيجة
                    else:
                        raise ValueError("❌ Unknown action type")

                    success.append(action_copy)

            self.connection.commit()
            return {"success": success, "select": select_results}

        except Exception as e:
            self.connection.rollback()
            raise e

    # ============================================================
    # CREATE TABLE
    # ============================================================
    def _create_table(self, table_name, action):
        columns = action["columns"]
        primary_key = action.get("primary_key")
        column_defs = []

        for col_name, col_type in columns.items():
            mapped_type = self._map_column_type(col_type)
            if self.is_oracle or self.is_pg:
                column_defs.append(f"{col_name} {mapped_type}")
            else:  # MySQL
                column_defs.append(f"`{col_name}` {mapped_type}")

        if primary_key:
            if self.is_oracle or self.is_pg:
                column_defs.append(f"PRIMARY KEY ({primary_key})")
            else:
                column_defs.append(f"PRIMARY KEY (`{primary_key}`)")

        if self.is_oracle:
            self.cursor.execute(
                "SELECT COUNT(*) FROM user_tables WHERE table_name = :t",
                {"t": table_name.upper()}
            )
            exists = self.cursor.fetchone()[0]
            if not exists:
                sql = f"CREATE TABLE {table_name} ({', '.join(column_defs)})"
                self.cursor.execute(sql)
        elif self.is_mysql:
            sql = f"""
                CREATE TABLE IF NOT EXISTS `{table_name}` (
                    {', '.join(column_defs)}
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
            self.cursor.execute(sql)
        elif self.is_pg:
            sql = f"""
                CREATE TABLE IF NOT EXISTS {table_name} (
                    {', '.join(column_defs)}
                );
            """
            self.cursor.execute(sql)

    # ============================================================
    # DELETE
    # ============================================================
    def _delete(self, table_name, action):
        sql = f"DELETE FROM {table_name}"
        params = None

        if action.get("condition"):
            sql += " WHERE " + action["condition"]
        if action.get("params"):
            params = action["params"]

        self.cursor.execute(sql, params)

    # ============================================================
    # INSERT
    # ============================================================
    def _insert(self, table_name, action):
        data = {
            k: v for k, v in action.items()
            if k not in ("insert", "update", "delete", "condition", "create", "columns", "primary_key", "params", "set")
        }
        cols = ", ".join(data.keys())

        if self.is_oracle or self.is_pg:
            vals = ", ".join(f":{k}" for k in data.keys())
            params = data
        else:
            vals = ", ".join(["%s"] * len(data))
            params = list(data.values())

        sql = f"INSERT INTO {table_name} ({cols}) VALUES ({vals})"
        self.cursor.execute(sql, params)

    # ============================================================
    # UPDATE
    # ============================================================
    def _update(self, table_name, action):
        set_data = action.get("set", {})
        condition = action.get("condition")
        if not condition:
            raise ValueError("❌ UPDATE requires condition")

        if self.is_oracle or self.is_pg:
            set_clause = ", ".join(f"{k} = :{k}" for k in set_data.keys())
            params = dict(set_data)
        else:
            set_clause = ", ".join(f"{k} = %s" for k in set_data.keys())
            params = list(set_data.values())

        if action.get("params"):
            if self.is_oracle or self.is_pg:
                params.update(action["params"])
            else:
                params += action["params"]

        sql = f"UPDATE {table_name} SET {set_clause} WHERE {condition}"
        self.cursor.execute(sql, params)

    # ============================================================
    # SELECT
    # ============================================================
    def _select(self, table_name, action):
        sql = f"SELECT * FROM {table_name}"
        params = None

        if action.get("condition"):
            condition = action["condition"]
            # فقط لـ PostgreSQL: أضف علامات تنصيص لأسماء الأعمدة
            condition = self._quote_columns(condition)
            sql += " WHERE " + condition
        if action.get("params"):
            params = action["params"]

        self.cursor.execute(sql, params)

        rows = self.cursor.fetchall()
        cols = [col[0] for col in self.cursor.description]

        return [dict(zip(cols, row)) for row in rows]