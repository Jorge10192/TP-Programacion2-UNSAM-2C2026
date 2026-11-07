"""Reset only an explicitly designated disposable PostgreSQL test schema."""
import os
from pathlib import Path

from sqlalchemy import create_engine, text


def reset_postgres(url):
    engine = create_engine(url)
    try:
        target = engine.url
        if target.database != 'walos_ci_test' or target.host not in {'127.0.0.1', 'localhost'}:
            raise ValueError('Sólo se admite walos_ci_test en loopback')
        ci = os.getenv('CI', '').lower() == 'true'
        if not ci and target.port != 55439:
            raise ValueError('El clúster temporal local requiere puerto 55439')
        with engine.begin() as connection:
            database, directory = connection.execute(text(
                "SELECT current_database(), current_setting('data_directory')")).one()
            if database != 'walos_ci_test':
                raise ValueError('Base de pruebas incorrecta')
            if not ci:
                expected = os.getenv('WALOS_TEST_PGDATA')
                if not expected or Path(directory).resolve() != Path(expected).resolve():
                    raise ValueError('data_directory no coincide con WALOS_TEST_PGDATA verificado')
            connection.execute(text('DROP SCHEMA public CASCADE'))
            connection.execute(text('CREATE SCHEMA public AUTHORIZATION CURRENT_USER'))
    finally:
        engine.dispose()
