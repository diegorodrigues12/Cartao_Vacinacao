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

# ... (código anterior)

# 2. Rotas para Pessoas
@app.route('/pessoas', methods=['POST'])
def add_pessoa():
    try:
        data = request.get_json()
        if not data or 'nome' not in data or 'numero_identificacao' not in data:
            return jsonify({"message": "Dados inválidos: 'nome' e 'numero_identificacao' são obrigatórios."}), 400

        nome = data['nome']
        numero_identificacao = data['numero_identificacao']

        if Pessoa.query.filter_by(numero_identificacao=numero_identificacao).first():
            return jsonify({"message": f"Pessoa com número de identificação '{numero_identificacao}' já existe."}), 409

        new_pessoa = Pessoa(nome=nome, numero_identificacao=numero_identificacao)
        db.session.add(new_pessoa)
        db.session.commit()
        return pessoa_schema.jsonify(new_pessoa), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Erro ao cadastrar pessoa: {str(e)}"}), 500

@app.route('/pessoas', methods=['GET'])
def get_pessoas():
    all_pessoas = Pessoa.query.all()
    return pessoas_schema.jsonify(all_pessoas), 200

@app.route('/pessoas/<int:id>', methods=['GET'])
def get_pessoa(id):
    pessoa = Pessoa.query.get(id)
    if not pessoa:
        return jsonify({"message": "Pessoa não encontrada."}), 404
    return pessoa_schema.jsonify(pessoa), 200

@app.route('/pessoas/<int:id>', methods=['DELETE'])
def delete_pessoa(id):
    pessoa = Pessoa.query.get(id)
    if not pessoa:
        return jsonify({"message": "Pessoa não encontrada."}), 404

    try:
        # Devido ao cascade="all, delete-orphan" em Pessoa, as vacinações associadas serão excluídas.
        db.session.delete(pessoa)
        db.session.commit()
        return jsonify({"message": "Pessoa e seu cartão de vacinação removidos com sucesso."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Erro ao remover pessoa: {str(e)}"}), 500

# ... (restante do código)
# ... (código anterior)

# 3. Rotas para Vacinações
@app.route('/vacinacoes', methods=['POST'])
def add_vacinacao():
    try:
        data = request.get_json()
        required_fields = ['pessoa_id', 'vacina_id', 'dose_aplicada']
        if not all(field in data for field in required_fields):
            return jsonify({"message": f"Dados inválidos: {', '.join(required_fields)} são obrigatórios."}), 400

        pessoa_id = data['pessoa_id']
        vacina_id = data['vacina_id']
        dose_aplicada = data['dose_aplicada']
        data_aplicacao_str = data.get('data_aplicacao')

        pessoa = Pessoa.query.get(pessoa_id)
        if not pessoa:
            return jsonify({"message": "Pessoa não encontrada."}), 404

        vacina = Vacina.query.get(vacina_id)
        if not vacina:
            return jsonify({"message": "Vacina não encontrada."}), 404

        # Validação da dose (exemplo básico, pode ser mais complexo)
        doses_validas = ["1a Dose", "2a Dose", "3a Dose", "Reforço", "Dose Única", "BCG", "Faltoso", "4a Dose", "5a Dose"] # Adicionado mais algumas doses comuns
        if dose_aplicada not in doses_validas:
             return jsonify({"message": f"Dose '{dose_aplicada}' inválida. Doses válidas: {', '.join(doses_validas)}"}), 400

        # Verifica se já existe uma vacinação com a mesma pessoa, vacina e dose
        existing_vacinacao = Vacinacao.query.filter_by(
            pessoa_id=pessoa_id,
            vacina_id=vacina_id,
            dose_aplicada=dose_aplicada
        ).first()

        if existing_vacinacao:
            return jsonify({"message": f"Essa dose ('{dose_aplicada}') da vacina '{vacina.nome}' já foi registrada para esta pessoa."}), 409

        if data_aplicacao_str:
            try:
                data_aplicacao = datetime.strptime(data_aplicacao_str, '%Y-%m-%dT%H:%M:%S')
            except ValueError:
                return jsonify({"message": "Formato de data inválido. Use YYYY-MM-DDTHH:MM:SS"}), 400
        else:
            data_aplicacao = datetime.utcnow()

        new_vacinacao = Vacinacao(
            pessoa_id=pessoa_id,
            vacina_id=vacina_id,
            data_aplicacao=data_aplicacao,
            dose_aplicada=dose_aplicada
        )
        db.session.add(new_vacinacao)
        db.session.commit()
        return vacinacao_schema.jsonify(new_vacinacao), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Erro ao cadastrar vacinação: {str(e)}"}), 500

# Consultar o cartão de vacinação de uma pessoa
@app.route('/pessoas/<int:pessoa_id>/cartao_vacinacao', methods=['GET'])
def get_cartao_vacinacao(pessoa_id):
    pessoa = Pessoa.query.get(pessoa_id)
    if not pessoa:
        return jsonify({"message": "Pessoa não encontrada."}), 404

    vacinacoes = Vacinacao.query.filter_by(pessoa_id=pessoa_id).order_by(Vacinacao.data_aplicacao.asc()).all()

    cartao_vacinacao_data = {
        "pessoa": pessoa_schema.dump(pessoa),
        "vacinas_registradas": []
    }

    vacinas_agrupadas = {}
    for vacinacao in vacinacoes:
        vacina_nome = vacinacao.vacina.nome
        if vacina_nome not in vacinas_agrupadas:
            vacinas_agrupadas[vacina_nome] = {
                "id_vacina": vacinacao.vacina_id, # Adicionado o ID da vacina para facilitar
                "nome_vacina": vacina_nome,
                "doses": []
            }
        vacinas_agrupadas[vacina_nome]["doses"].append({
            "id_vacinacao": vacinacao.id,
            "data_aplicacao": vacinacao.data_aplicacao.isoformat(),
            "dose_aplicada": vacinacao.dose_aplicada
        })

    for vacina_nome, data in vacinas_agrupadas.items():
        cartao_vacinacao_data["vacinas_registradas"].append(data)

    return jsonify(cartao_vacinacao_data), 200

# Excluir registro de vacinação específico
@app.route('/vacinacoes/<int:id>', methods=['DELETE'])
def delete_vacinacao(id):
    vacinacao = Vacinacao.query.get(id)
    if not vacinacao:
        return jsonify({"message": "Registro de vacinação não encontrado."}), 404

    try:
        db.session.delete(vacinacao)
        db.session.commit()
        return jsonify({"message": "Registro de vacinação removido com sucesso."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Erro ao remover registro de vacinação: {str(e)}"}), 500

# ... (restante do código)