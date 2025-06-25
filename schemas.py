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
    # A linha abaixo precisa ser alterada
    # data_aplicacao = ma.fields.DateTime(format='%Y-%m-%dT%H:%M:%S')

    # Para esta:
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
        # É crucial NÃO expor password_hash diretamente via API.
        load_only = ("password",) # Campo 'password' para carregamento (input), não exibição
        dump_only = ("id", "password_hash",) # Campo 'id' e 'password_hash' apenas para exibição (mas password_hash não deve ser dumpado em produção)
        # Atenção: 'password_hash' deve ser apenas para uso interno e não deve ser exposto em APIs de produção.
        # dump_only geralmente incluiria apenas o 'id' e 'username'.
        # Para produção, você pode definir 'fields = ("id", "username")' explicitamente.

# Adicione a instanciação do UserSchema no app.py depois de adicionar este schema
# user_schema = UserSchema()
