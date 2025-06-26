Cartão de Vacinação Digital
Este projeto é um sistema web para gerenciar cartões de vacinação de forma eficiente. Ele permite o cadastro, consulta e controle do histórico de vacinas aplicadas em pessoas.

Funcionalidades Chave
Autenticação Segura: Login e registro de usuários com JWT.

Gestão de Pessoas: Cadastro, consulta e exclusão de indivíduos.

Controle de Vacinas: Registro detalhado de doses e status (aplicada, faltoso).

Visualização Interativa: Tabela de vacinação por categoria.

Exportação de Dados: Geração de arquivo CSV com o histórico do cartão.

Tecnologias Principais
Backend: Python (Flask, SQLAlchemy, Flask-JWT-Extended)

Frontend: HTML, CSS, JavaScript (Vanilla JS)

Banco de Dados: SQLite

Como Rodar o Projeto
Clone o repositório e entre na pasta: git clone <URL_DO_SEU_REPOSITORIO> e cd cartao_vacinacao_api

Crie e ative o ambiente virtual: python -m venv venv e venv\Scripts\activate (Win) / source venv/bin/activate (Linux/macOS)

Instale as dependências: pip install -r requirements.txt

Exclua o DB antigo (se existir): del cartao_vacinacao.db (Win) ou rm cartao_vacinacao.db (Linux/macOS)

Inicie o servidor Flask: flask run

Acesse no navegador: http://127.0.0.1:5000/
