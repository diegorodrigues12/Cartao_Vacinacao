from flask_marshmallow import Marshmallow
from models import Vacina, Pessoa, Vacinacao, User # NOVA IMPORTAÇÃO: User
from datetime import datetime
from marshmallow import fields # Importado para usar fields.DateTime e outros tipos de campo

ma = Marshmallow()

class VacinaSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Vacina
        load_instance = True
        sqla_session = None # Será definido no app.py

class PessoaSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Pessoa
        load_instance = True
        sqla_session = None

class VacinacaoSchema(ma.SQLAlchemyAutoSchema):
    data_aplicacao = fields.DateTime(format='%Y-%m-%dT%H:%M:%S')

    class Meta:
        model = Vacinacao
        load_instance = True
        sqla_session = None

# NOVO: Esquema para o modelo de Usuário
class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        sqla_session = None # Será definido no app.py
        # Campos que devem ser visíveis ou carregáveis.
        # 'password' é 'load_only' (apenas para entrada)
        load_only = ("password",) 
        # 'id' e 'username' são 'dump_only' (apenas para saída)
        # NUNCA inclua 'password_hash' em 'dump_only' em produção, pois ele exporia o hash da senha.
        dump_only = ("id", "username",) # Expondo apenas id e username na saída JSON
