// cartao_vacinacao_api/static/script.js

const API_BASE_URL = 'http://127.0.0.1:5000'; // Endereço da sua API Flask

let currentPessoaId = null;
let allVacinas = []; // Para armazenar todas as vacinas disponíveis
let deleteTarget = { type: null, id: null }; // Para o modal de confirmação de exclusão

document.addEventListener('DOMContentLoaded', () => {
    loadPessoas(); // Carrega as pessoas ao carregar a página
});

// --- Funções de Ajuda ---

async function fetchData(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error; // Re-lança o erro para ser tratado pela função chamadora
    }
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    // Limpar mensagens de erro ao fechar
    const messageElement = document.getElementById(modalId.replace('Modal', 'Message'));
    if (messageElement) {
        messageElement.textContent = '';
    }
}

// --- Funções de Carregamento de Dados ---

async function loadPessoas() {
    try {
        const pessoas = await fetchData(`${API_BASE_URL}/pessoas`);
        const pessoaSelect = document.getElementById('pessoaSelect');
        pessoaSelect.innerHTML = '<option value="">-- Selecione uma pessoa --</option>'; // Limpa e adiciona opção padrão
        pessoas.forEach(pessoa => {
            const option = document.createElement('option');
            option.value = pessoa.id;
            option.textContent = `${pessoa.nome} (ID: ${pessoa.id})`;
            pessoaSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar pessoas:', error);
    }
}

async function loadPessoaCartao() {
    currentPessoaId = document.getElementById('pessoaSelect').value;
    const cartaoSection = document.getElementById('cartaoVacinacaoSection');
    const currentPessoaNomeSpan = document.getElementById('currentPessoaNome');
    const currentPessoaIdSpan = document.getElementById('currentPessoaId');
    const currentPessoaIdentificacaoSpan = document.getElementById('currentPessoaIdentificacao');

    if (!currentPessoaId) {
        cartaoSection.style.display = 'none';
        currentPessoaNomeSpan.textContent = '';
        currentPessoaIdSpan.textContent = '';
        currentPessoaIdentificacaoSpan.textContent = '';
        return;
    }

    try {
        const cartaoData = await fetchData(`${API_BASE_URL}/pessoas/${currentPessoaId}/cartao_vacinacao`);
        const pessoa = cartaoData.pessoa;
        const vacinasRegistradas = cartaoData.vacinas_registradas;

        currentPessoaNomeSpan.textContent = pessoa.nome;
        currentPessoaIdSpan.textContent = pessoa.id;
        currentPessoaIdentificacaoSpan.textContent = pessoa.numero_identificacao;
        cartaoSection.style.display = 'block';

        renderCartaoVacinacaoTable(vacinasRegistradas);

    } catch (error) {
        console.error('Erro ao carregar cartão de vacinação:', error);
        alert('Erro ao carregar cartão de vacinação. Verifique se a pessoa existe ou se há um erro na API.');
        cartaoSection.style.display = 'none';
    }
}

async function loadVacinasForSelect() {
    try {
        allVacinas = await fetchData(`${API_BASE_URL}/vacinas`); // Armazena todas as vacinas
        const vacinaSelect = document.getElementById('vacinacaoVacinaSelect');
        vacinaSelect.innerHTML = ''; // Limpa as opções existentes
        allVacinas.forEach(vacina => {
            const option = document.createElement('option');
            option.value = vacina.id;
            option.textContent = vacina.nome;
            vacinaSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar vacinas para o select:', error);
    }
}

// --- Funções de Renderização da Tabela ---

function renderCartaoVacinacaoTable(vacinasRegistradas) {
    const vacinasTable = document.getElementById('vacinasTable');
    const thead = vacinasTable.querySelector('thead');
    const tbody = vacinasTable.querySelector('tbody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Cabeçalho da tabela
    let headerRow = document.createElement('tr');
    let thDose = document.createElement('th');
    thDose.textContent = 'Tipo / Dose';
    headerRow.appendChild(thDose);

    // Array de nomes de vacinas únicos e ordenados (da imagem original)
    const vacinaNamesInOrder = [
        "BCG", "HEPATITE B", "ANTI-POLIO (SABIN)", "TETRA VALENTE",
        "TRIPLICE BACTERIANA (DPT)", "HAEMOPHILUS INFLUENZAE",
        "TRIPLICE ACELULAR", "PNEUMO 10 VALENTE", "MENINGO C", "ROTAVIRUS"
    ];

    // Mapeia vacinas registradas por nome para facilitar o acesso
    const vacinasRegistradasMap = {};
    vacinasRegistradas.forEach(v => {
        vacinasRegistradasMap[v.nome_vacina] = v;
    });

    // Adiciona as colunas de vacinas ao cabeçalho na ordem definida
    vacinaNamesInOrder.forEach(vacinaName => {
        let th = document.createElement('th');
        th.textContent = vacinaName;
        th.classList.add('vacina-cell');
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Tipos de doses que queremos exibir nas linhas (agora correspondendo aos valores do HTML e da API)
    const dosesTypes = [
        "1a Dose", "2a Dose", "3a Dose",
        "Reforco", "1a Reforco", "2a Reforco",
        "Dose Unica", "BCG", "Faltoso", "4a Dose", "5a Dose"
    ];

    dosesTypes.forEach(doseType => {
        let row = document.createElement('tr');
        let tdDoseType = document.createElement('td');
        // Formata o texto da dose para exibição (ex: 1a Dose -> 1ª Dose)
        let displayDoseType = doseType
            .replace('a Dose', 'ª Dose')
            .replace('a Reforco', 'º Reforço')
            .replace('Unica', 'Única');
        tdDoseType.textContent = displayDoseType;
        tdDoseType.style.fontWeight = 'bold';
        tdDoseType.style.color = '#007bff';
        tdDoseType.style.backgroundColor = '#eef';
        row.appendChild(tdDoseType);

        vacinaNamesInOrder.forEach(vacinaName => {
            let td = document.createElement('td');
            td.classList.add('dose-cell');

            const vacinaData = vacinasRegistradasMap[vacinaName];
            let doseFound = false;
            if (vacinaData && vacinaData.doses) {
                // A comparação agora é direta com o valor exato da API
                const dose = vacinaData.doses.find(d => d.dose_aplicada === doseType);

                if (dose) {
                    td.textContent = `Aplicada: ${new Date(dose.data_aplicacao).toLocaleDateString()}`;
                    td.classList.add('aplicada');
                    // Botão de exclusão para a dose específica
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'X';
                    deleteButton.style.marginLeft = '5px';
                    deleteButton.style.padding = '2px 5px';
                    deleteButton.style.fontSize = '0.7em';
                    deleteButton.style.backgroundColor = '#dc3545';
                    deleteButton.style.color = 'white'; // Cor do texto do botão
                    deleteButton.style.borderRadius = '3px';
                    
                    // console.log para depurar o ID da dose
                    console.log(`Botão de exclusão criado para Vacina: ${vacinaName}, Dose: ${doseType}, ID da Vacinação: ${dose.id_vacinacao}`); // USANDO dose.id_vacinacao

                    deleteButton.onclick = (event) => {
                        event.stopPropagation();
                        confirmDelete('vacinacao', dose.id_vacinacao); // USANDO dose.id_vacinacao AQUI
                    };
                    td.appendChild(deleteButton);

                    if (dose.dose_aplicada === 'Faltoso') {
                        td.classList.add('faltoso');
                    }
                    doseFound = true;
                }
            }
            if (!doseFound) {
                td.textContent = ''; // Vazio se não houver dose correspondente
            }
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
}


// --- Funções de Ação (Adicionar/Remover) ---

async function addPessoa() {
    const nome = document.getElementById('newPessoaNome').value;
    const identificacao = document.getElementById('newPessoaIdentificacao').value;
    const messageElement = document.getElementById('addPessoaMessage');

    if (!nome || !identificacao) {
        messageElement.textContent = 'Nome e Número de Identificação são obrigatórios.';
        return;
    }

    try {
        await fetchData(`${API_BASE_URL}/pessoas`, 'POST', { nome: nome, numero_identificacao: identificacao });
        alert('Pessoa cadastrada com sucesso!');
        closeModal('addPessoaModal');
        document.getElementById('newPessoaNome').value = '';
        document.getElementById('newPessoaIdentificacao').value = '';
        await loadPessoas(); // Recarregar a lista de pessoas
    } catch (error) {
        messageElement.textContent = error.message;
    }
}

// A função addVacina foi removida da UI, e sua lógica foi simplificada aqui,
// já que o cadastro de vacinas é feito na inicialização do backend.
async function addVacina() {
    // Esta função não é mais acionada pela UI, mas mantida como placeholder
    // caso haja uma forma de adicionar vacinas no futuro (ex: via admin)
    console.log("A função addVacina não é mais acionada pela interface do usuário.");
    // Remover ou ajustar conforme necessidade futura.
}


async function addVacinacao() {
    if (!currentPessoaId) {
        alert('Por favor, selecione uma pessoa primeiro.');
        return;
    }

    const vacinaId = document.getElementById('vacinacaoVacinaSelect').value;
    const doseAplicada = document.getElementById('vacinacaoDose').value;
    const dataAplicacao = document.getElementById('vacinacaoData').value; // Formato YYYY-MM-DD
    const messageElement = document.getElementById('addVacinacaoMessage');

    if (!vacinaId || !doseAplicada || !dataAplicacao) {
        messageElement.textContent = 'Todos os campos são obrigatórios para registrar a vacinação.';
        return;
    }

    // A API espera YYYY-MM-DDTHH:MM:SS. Pegar a hora atual para ser mais preciso.
    const now = new Date();
    const formattedTime = now.toTimeString().split(' ')[0]; // Ex: "16:30:00"
    const formattedDate = `${dataAplicacao}T${formattedTime}`;

    try {
        await fetchData(`${API_BASE_URL}/vacinacoes`, 'POST', {
            pessoa_id: parseInt(currentPessoaId),
            vacina_id: parseInt(vacinaId),
            dose_aplicada: doseAplicada,
            data_aplicacao: formattedDate
        });
        alert('Vacinação registrada com sucesso!');
        closeModal('addVacinacaoModal');
        await loadPessoaCartao(); // Recarregar o cartão da pessoa
    } catch (error) {
        messageElement.textContent = error.message;
    }
}

function confirmDelete(type, id) {
    deleteTarget = { type: type, id: id };
    let message = '';
    if (type === 'vacinacao') {
        message = 'Tem certeza que deseja excluir este registro de vacinação?';
    } else if (type === 'pessoa') {
        message = 'Tem certeza que deseja excluir esta pessoa? Todas as suas vacinações também serão excluídas.';
    } else if (type === 'vacina') {
        // Este caso seria mais complexo na UI, mas a lógica está aqui
        message = 'Tem certeza que deseja excluir esta vacina? Todos os registros de vacinação relacionados a ela também serão excluídos.';
    }
    document.getElementById('confirmDeleteMessage').textContent = message;
    showModal('confirmDeleteModal');
}

async function executeDelete() {
    closeModal('confirmDeleteModal');
    try {
        if (deleteTarget.type === 'vacinacao') {
            await fetchData(`${API_BASE_URL}/vacinacoes/${deleteTarget.id}`, 'DELETE');
            alert('Registro de vacinação excluído com sucesso!');
            await loadPessoaCartao(); // Recarregar o cartão após exclusão
        } else if (deleteTarget.type === 'pessoa') {
            await fetchData(`${API_BASE_URL}/pessoas/${deleteTarget.id}`, 'DELETE');
            alert('Pessoa excluída com sucesso!');
            await loadPessoas(); // Recarregar a lista de pessoas
            currentPessoaId = null; // Limpar a pessoa selecionada
            document.getElementById('pessoaSelect').value = '';
            loadPessoaCartao(); // Limpar informações do cartão (esconder seção)
        } else if (deleteTarget.type === 'vacina') {
            await fetchData(`${API_BASE_URL}/vacinas/${deleteTarget.id}`, 'DELETE');
            alert('Vacina excluída com sucesso!');
            await loadVacinasForSelect(); // Recarregar a lista de vacinas
            await loadPessoaCartao(); // Recarregar o cartão caso a vacina estivesse nele
        }
    } catch (error) {
        alert('Erro ao excluir: ' + error.message);
    } finally {
        deleteTarget = { type: null, id: null }; // Limpa o target
    }
}

// --- Funções para Abrir Modais e Preparar Dados ---

function openAddPessoaModal() {
    document.getElementById('newPessoaNome').value = '';
    document.getElementById('newPessoaIdentificacao').value = '';
    document.getElementById('addPessoaMessage').textContent = '';
    showModal('addPessoaModal');
}

// A função openAddVacinaModal foi removida da UI.
// Removida pois o botão de acionamento não existe mais no HTML.

async function openAddVacinacaoModal() {
    if (!currentPessoaId) {
        alert('Por favor, selecione uma pessoa primeiro para registrar uma vacinação.');
        return;
    }
    document.getElementById('vacinacaoPessoaNome').textContent = document.getElementById('currentPessoaNome').textContent;
    document.getElementById('addVacinacaoMessage').textContent = '';
    await loadVacinasForSelect(); // Carrega as vacinas no select
    // Define a data atual como padrão no input date
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    document.getElementById('vacinacaoData').value = today;
    showModal('addVacinacaoModal');
}
