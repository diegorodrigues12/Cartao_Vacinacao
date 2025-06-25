# cartao_vacinacao_api/app.py
from flask import Flask, request, jsonify
from config import Config
from models import db, Vacina, Pessoa, Vacinacao # Importar todos os modelos
from schemas import ma, VacinaSchema, PessoaSchema, VacinacaoSchema # Importar todos os schemas
from datetime import datetime
import os # Importar para possível uso de variáveis de ambiente

app = Flask(__name__)
app.config.from_object(Config)

# Inicializa as extensões
db.init_app(app)
ma.init_app(app)

# Definir a sessão do SQLAlchemy para os schemas
VacinaSchema.Meta.sqla_session = db.session
PessoaSchema.Meta.sqla_session = db.session
VacinacaoSchema.Meta.sqla_session = db.session

# Instancia os schemas
vacina_schema = VacinaSchema()
vacinas_schema = VacinaSchema(many=True)
pessoa_schema = PessoaSchema()
pessoas_schema = PessoaSchema(many=True)
vacinacao_schema = VacinacaoSchema()
vacinacoes_schema = VacinacaoSchema(many=True)


# Cria as tabelas no banco de dados se elas não existirem
with app.app_context():
    db.create_all()

# --- Rotas da API ---

# 1. Rotas para Vacinas
@app.route('/vacinas', methods=['POST'])
def add_vacina():
    try:
        data = request.get_json()
        if not data or 'nome' not in data:
            return jsonify({"message": "Dados inválidos: 'nome' da vacina é obrigatório."}), 400

        nome = data['nome']
        if Vacina.query.filter_by(nome=nome).first():
            return jsonify({"message": f"Vacina '{nome}' já existe."}), 409

        new_vacina = Vacina(nome=nome)
        db.session.add(new_vacina)
        db.session.commit()
        return vacina_schema.jsonify(new_vacina), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Erro ao cadastrar vacina: {str(e)}"}), 500

@app.route('/vacinas', methods=['GET'])
def get_vacinas():
    all_vacinas = Vacina.query.all()
    return vacinas_schema.jsonify(all_vacinas), 200

@app.route('/vacinas/<int:id>', methods=['GET'])
def get_vacina(id):
    vacina = Vacina.query.get(id)
    if not vacina:
        return jsonify({"message": "Vacina não encontrada."}), 404
    return vacina_schema.jsonify(vacina), 200

@app.route('/vacinas/<int:id>', methods=['DELETE'])
def delete_vacina(id):
    vacina = Vacina.query.get(id)
    if not vacina:
        return jsonify({"message": "Vacina não encontrada."}), 404

    try:
        db.session.delete(vacina)
        db.session.commit()
        return jsonify({"message": "Vacina removida com sucesso."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Erro ao remover vacina: {str(e)}"}), 500


# Rota principal para teste inicial
@app.route('/')
def index():
    return jsonify({"message": "Bem-vindo à API de Cartão de Vacinação!"})

if __name__ == '__main__':
    app.run(debug=True)