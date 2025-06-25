# cartao_vacinacao_api/app.py
from flask import Flask, request, jsonify, render_template
from config import Config
from models import db, Vacina, Pessoa, Vacinacao
from schemas import ma, VacinaSchema, PessoaSchema, VacinacaoSchema
from datetime import datetime
import os
import logging # Importar o módulo logging

app = Flask(__name__)
app.config.from_object(Config)

# Configurar logging básico (opcional, mas recomendado para depuração em produção)
if not app.debug:
    file_handler = logging.FileHandler('error.log')
    file_handler.setLevel(logging.WARNING)
    app.logger.addHandler(file_handler)

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

# Cria as tabelas no banco de dados se elas não existirem e popula vacinas iniciais
with app.app_context():
    db.create_all()

    initial_vacinas = [
        "BCG", "HEPATITE B", "ANTI-POLIO (SABIN)", "TETRA VALENTE",
        "TRIPLICE BACTERIANA (DPT)", "HAEMOPHILUS INFLUENZAE",
        "TRIPLICE ACELULAR", "PNEUMO 10 VALENTE", "MENINGO C", "ROTAVIRUS"
    ]

    for vacina_nome in initial_vacinas:
        if not Vacina.query.filter_by(nome=vacina_nome).first():
            new_vacina = Vacina(nome=vacina_nome)
            db.session.add(new_vacina)
            print(f"Vacina '{vacina_nome}' adicionada ao banco de dados.")
    db.session.commit()
    print("Vacinas iniciais populadas ou já existentes.")

# --- Manipulador de Erro Global (NOVO) ---
# Garante que erros 500 (erros internos do servidor) sempre retornem JSON
@app.errorhandler(500)
def internal_server_error(e):
    # Registrar a exceção completa para depuração no servidor
    app.logger.exception("Ocorreu uma exceção não tratada durante uma requisição.")
    return jsonify({"message": "Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde."}), 500

# --- Rotas da API ---

# Rota para servir a página HTML principal
@app.route('/')
def serve_index():
    return render_template('index.html')

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
        app.logger.error(f"Erro ao cadastrar vacina: {str(e)}")
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
        app.logger.error(f"Erro ao remover vacina com ID {id}: {str(e)}")
        return jsonify({"message": f"Erro ao remover vacina: {str(e)}"}), 500


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
        app.logger.error(f"Erro ao cadastrar pessoa: {str(e)}")
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
        app.logger.error(f"Erro ao remover pessoa com ID {id}: {str(e)}")
        return jsonify({"message": f"Erro ao remover pessoa: {str(e)}"}), 500


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
        doses_validas = ["1a Dose", "2a Dose", "3a Dose", "Reforco", "Dose Unica", "BCG", "Faltoso", "4a Dose", "5a Dose", "1a Reforco", "2a Reforco"]
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
                return jsonify({"message": "Formato de data inválido. Use%Y-%m-%dT%H:%M:%S"}), 400
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
        app.logger.error(f"Erro ao cadastrar vacinação: {str(e)}")
        return jsonify({"message": f"Erro ao cadastrar vacinação: {str(e)}"}), 500

# Consultar o cartão de vacinação de uma pessoa
@app.route('/pessoas/<int:pessoa_id>/cartao_vacinacao', methods=['GET'])
def get_cartao_vacinacao(pessoa_id):
    pessoa = Pessoa.query.get(pessoa_id)
    if not pessoa:
        return jsonify({"message": "Pessoa não encontrada."}), 404

    # Usa `join` para buscar os nomes das vacinas e seus IDs diretamente do banco
    vacinacoes = db.session.query(Vacinacao, Vacina.nome, Vacina.id.label('vacina_db_id'))\
                           .join(Vacina)\
                           .filter(Vacinacao.pessoa_id == pessoa_id)\
                           .order_by(Vacinacao.data_aplicacao.asc())\
                           .all()

    cartao_vacinacao_data = {
        "pessoa": pessoa_schema.dump(pessoa),
        "vacinas_registradas": []
    }

    vacinas_agrupadas = {}
    for vacinacao_obj, vacina_nome, vacina_db_id in vacinacoes:
        if vacina_nome not in vacinas_agrupadas:
            vacinas_agrupadas[vacina_nome] = {
                "id_vacina": vacina_db_id,
                "nome_vacina": vacina_nome,
                "doses": []
            }
        vacinas_agrupadas[vacina_nome]["doses"].append({
            "id_vacinacao": vacinacao_obj.id,
            "data_aplicacao": vacinacao_obj.data_aplicacao.isoformat(),
            "dose_aplicada": vacinacao_obj.dose_aplicada
        })

    # Convertendo o dicionário de vacinas agrupadas para uma lista para a resposta JSON
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
        # Registrar o erro detalhado no log do servidor
        app.logger.error(f"Erro no backend ao remover vacinação com ID {id}: {str(e)}")
        # Retornar uma mensagem de erro genérica para o frontend
        return jsonify({"message": "Falha ao remover o registro de vacinação. Tente novamente."}), 500

if __name__ == '__main__':
    app.run(debug=True)
