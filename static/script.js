// cartao_vacinacao_api/static/scripts.js

const API_BASE_URL = 'http://127.0.0.1:5000'; // Endereço da sua API Flask

let currentPessoaId = null;
let allVacinas = []; // Para armazenar TODAS as vacinas disponíveis (sem filtro de categoria)
let deleteTarget = { type: null, id: null }; // Para o modal de confirmação de exclusão
let currentCartaoData = null; // Para armazenar os dados do cartão de vacinação atual
let currentCategory = 'Nacional'; // Categoria ativa padrão (primeira aba)

// Variáveis para autenticação
let jwtToken = localStorage.getItem('access_token') || null; // Tenta carregar o token do localStorage
let isLoggedIn = false;

document.addEventListener('DOMContentLoaded', async () => { 
    // Garante que o estado de login seja verificado e a UI configurada ao carregar a página
    await checkLoginStatus(); 

    // Ativa a aba "Nacional" visualmente no carregamento inicial
    const defaultTab = document.querySelector('.tab-menu .tab-item[data-category="Nacional"]');
    if (defaultTab) {
        defaultTab.classList.add('active');
    }
});

// --- Funções de Ajuda ---

async function fetchData(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (jwtToken) {
        options.headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        console.log(`-> fetchData: Requisição: ${method} ${url}, Headers:`, options.headers, "Body:", data); 
        const response = await fetch(url, options);
        console.log(`-> fetchData: Resposta para ${url}: Status ${response.status}`); 

        if (response.status === 401) {
            logoutUser(false); // Força o logout, mas sem o alert de "desconectado"
            throw new Error("Não autorizado ou sessão expirada. Por favor, faça login novamente."); 
        }
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`-> fetchData: Erro na requisição (JSON da resposta):`, errorData); 
            if (response.status === 409) {
                throw new Error(errorData.message || "Recurso já existente (conflito).");
            } else if (response.status === 422) {
                // Erro 422 para validação de dados: usa a mensagem do backend se existir
                let errorMessage = "Dados inválidos enviados. Verifique os campos.";
                if (errorData.message) {
                    if (typeof errorData.message === 'object' && errorData.message !== null) {
                        let fieldErrors = [];
                        for (const field in errorData.message) {
                            fieldErrors.push(`${field}: ${errorData.message[field].join(', ')}`);
                        }
                        errorMessage = "Dados inválidos: " + fieldErrors.join('; ');
                    } else {
                        errorMessage = errorData.message; 
                    }
                } else if (errorData.errors) { 
                    let fieldErrors = [];
                    for (const field in errorData.errors) {
                        fieldErrors.push(`${field}: ${errorData.errors[field].join(', ')}`);
                    }
                    errorMessage = "Dados inválidos: " + fieldErrors.join('; ');
                }
                throw new Error(errorMessage);
            }
            throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('-> fetchData: Erro geral na requisição:', error); 
        throw error; 
    }
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    const messageElement = document.getElementById(modalId.replace('Modal', 'Message'));
    if (messageElement) {
        messageElement.textContent = '';
    }
}

// --- Funções de Autenticação ---

async function checkLoginStatus() { 
    const authSection = document.getElementById('authSection');
    const appContent = document.getElementById('appContent');
    const loggedInUserSpan = document.getElementById('loggedInUser');
    const logoutButton = document.getElementById('logoutButton');

    // Inicializa a UI para o estado "deslogado"
    authSection.style.display = 'block';
    appContent.style.display = 'none';

    // Limpa detalhes do usuário logado/UI quando deslogado ou verificando status
    loggedInUserSpan.textContent = ''; 
    logoutButton.style.display = 'none'; 
    document.getElementById('currentPessoaNome').textContent = '';
    document.getElementById('currentPessoaId').textContent = '';
    document.getElementById('currentPessoaIdentificacao').textContent = '';
    document.getElementById('deletePessoaButton').style.display = 'none';
    document.getElementById('cartaoVacinacaoSection').style.display = 'none';
    renderCartaoVacinacaoTable([]); // Garante que a tabela esteja limpa inicialmente


    if (jwtToken && localStorage.getItem('access_token')) { 
        isLoggedIn = true;
        try {
            await loadPessoas(); 
            
            // Se loadPessoas() for bem-sucedido (sem lançar erro), então o usuário está validamente logado.
            authSection.style.display = 'none'; 
            appContent.style.display = 'block';
            loggedInUserSpan.textContent = `Logado como: Usuário`; 
            logoutButton.style.display = 'inline-block';

        } catch (error) {
            console.error("Falha ao validar token no checkLoginStatus (token expirado/inválido):", error);
            isLoggedIn = false; 
            jwtToken = null; 
            localStorage.removeItem('access_token');
        }
    } else {
        isLoggedIn = false;
        jwtToken = null; 
        localStorage.removeItem('access_token');
    }
}

async function registerUser() {
    const username = document.getElementById('authUsername').value;
    const password = document.getElementById('authPassword').value;
    const authMessage = document.getElementById('authMessage');

    authMessage.textContent = '';
    if (!username || !password) {
        authMessage.style.color = 'red';
        authMessage.textContent = 'Usuário e senha são obrigatórios para registrar.';
        return;
    }

    try {
        const response = await fetchData(`${API_BASE_URL}/register`, 'POST', { username, password });
        authMessage.style.color = 'green';
        authMessage.textContent = response.message || 'Registro bem-sucedido! Agora faça login.';
        document.getElementById('authPassword').value = ''; 
    } catch (error) {
        authMessage.style.color = 'red';
        authMessage.textContent = error.message;
        console.error('Erro no registro:', error);
    }
}

async function loginUser() {
    const username = document.getElementById('authUsername').value;
    const password = document.getElementById('authPassword').value;
    const authMessage = document.getElementById('authMessage');

    authMessage.textContent = '';
    if (!username || !password) {
        authMessage.style.color = 'red';
        authMessage.textContent = 'Usuário e senha são obrigatórios para login.';
        return;
    }

    try {
        const response = await fetchData(`${API_BASE_URL}/login`, 'POST', { username, password });
        jwtToken = response.access_token;
        localStorage.setItem('access_token', jwtToken); 
        authMessage.style.color = 'green';
        authMessage.textContent = 'Login bem-sucedido!';
        console.log("Token recebido:", jwtToken);
        document.getElementById('authUsername').value = '';
        document.getElementById('authPassword').value = '';
        await checkLoginStatus(); 
    } catch (error) {
        authMessage.style.color = 'red';
        authMessage.textContent = error.message || "Erro desconhecido no login.";
        console.error('Erro no login:', error);
        jwtToken = null; 
        localStorage.removeItem('access_token');
        checkLoginStatus(); 
    }
}

function logoutUser(showAlert = true) {
    jwtToken = null;
    localStorage.removeItem('access_token');
    if (showAlert) {
        alert("Você foi desconectado."); 
    }
    checkLoginStatus(); 
}

// --- Funções de Carregamento de Dados ---

async function loadPessoas() {
    if (!isLoggedIn) return; 

    try {
        console.log("-> loadPessoas: Buscando lista de pessoas...");
        const pessoas = await fetchData(`${API_BASE_URL}/pessoas`);
        console.log("-> loadPessoas: Pessoas carregadas:", pessoas);

        const pessoaSelect = document.getElementById('pessoaSelect');
        pessoaSelect.innerHTML = '<option value="">-- Selecione uma pessoa --</option>'; 
        pessoas.forEach(pessoa => { 
            const option = document.createElement('option');
            option.value = pessoa.id;
            option.textContent = `${pessoa.nome} (ID: ${pessoa.id})`;
            pessoaSelect.appendChild(option);
        });
        document.getElementById('deletePessoaButton').style.display = 'none';
        if (currentPessoaId && document.querySelector(`#pessoaSelect option[value="${currentPessoaId}"]`)) {
            pessoaSelect.value = currentPessoaId;
            loadPessoaCartao();
        } else {
            currentPessoaId = null;
            loadPessoaCartao();
        }
    } catch (error) {
        console.error('Erro ao carregar pessoas (loadPessoas):', error);
        alert(`Falha ao carregar lista de pessoas: ${error.message}`);
    }
}

async function loadPessoaCartao() {
    if (!isLoggedIn) {
        alert("Você precisa estar logado para carregar o cartão de vacinação.");
        return;
    }

    currentPessoaId = document.getElementById('pessoaSelect').value;
    const cartaoSection = document.getElementById('cartaoVacinacaoSection');
    const currentPessoaNomeSpan = document.getElementById('currentPessoaNome');
    const currentPessoaIdSpan = document.getElementById('currentPessoaId');
    const currentPessoaIdentificacaoSpan = document.getElementById('currentPessoaIdentificacao');
    const deletePessoaButton = document.getElementById('deletePessoaButton');

    if (!currentPessoaId) {
        cartaoSection.style.display = 'none';
        currentPessoaNomeSpan.textContent = '';
        currentPessoaIdSpan.textContent = '';
        currentPessoaIdentificacaoSpan.textContent = '';
        currentCartaoData = null;
        deletePessoaButton.style.display = 'none';
        renderCartaoVacinacaoTable([]);
        return;
    }

    try {
        console.log("-> loadPessoaCartao: Buscando cartão para pessoa ID:", currentPessoaId);
        currentCartaoData = await fetchData(`${API_BASE_URL}/pessoas/${currentPessoaId}/cartao_vacinacao`);
        console.log("-> loadPessoaCartao: Dados do cartão carregados:", currentCartaoData);

        const pessoa = currentCartaoData.pessoa;
        const vacinasRegistradas = currentCartaoData.vacinas_registradas;

        currentPessoaNomeSpan.textContent = pessoa.nome;
        currentPessoaIdSpan.textContent = pessoa.id;
        currentPessoaIdentificacaoSpan.textContent = pessoa.numero_identificacao;
        cartaoSection.style.display = 'block';
        deletePessoaButton.style.display = 'inline-block';

        await loadVacinasForSelect(); 

        renderCartaoVacinacaoTable(vacinasRegistradas);

    } catch (error) {
        console.error('Erro ao carregar cartão de vacinação:', error);
        alert('Erro ao carregar cartão de vacinação. Verifique se a pessoa existe ou se há um erro na API.');
        cartaoSection.style.display = 'none';
        currentCartaoData = null;
        deletePessoaButton.style.display = 'none';
    }
}

async function loadVacinasForSelect() {
    try {
        allVacinas = await fetchData(`${API_BASE_URL}/vacinas`); 
        const vacinaSelect = document.getElementById('vacinacaoVacinaSelect');
        vacinaSelect.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "-- Selecione uma vacina --";
        vacinaSelect.appendChild(defaultOption);

        allVacinas.forEach(vacina => {
            const option = document.createElement('option');
            option.value = vacina.id;
            option.textContent = vacina.nome;
            vacinaSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar vacinas para o select:', error);
        alert(`Falha ao carregar lista de vacinas: ${error.message}`);
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
    thDose.textContent = 'Vacinas / Doses';
    headerRow.appendChild(thDose);

    // Filtra as vacinas a serem exibidas na tabela pela categoria atual
    const vacinasExibirNestaCategoria = allVacinas.filter(vac => vac.categoria === currentCategory);
    
    // Array de nomes de vacinas únicos e ordenados (das vacinas filtradas)
    const vacinaNamesInOrder = vacinasExibirNestaCategoria.map(vac => vac.nome);

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

    // Tipos de doses que queremos exibir nas linhas (para corresponder à imagem e lógica)
    const dosesTypes = [
        "1a Dose", "2a Dose", "3a Dose",
        "1a Reforco", "2a Reforco",
        "Dose Unica", "BCG", "Faltoso", "4a Dose", "5a Dose"
    ];

    dosesTypes.forEach(doseType => {
        let row = document.createElement('tr');
        let tdDoseType = document.createElement('td');
        
        let tipoText = '';
        let doseText = '';

        if (doseType === "1a Dose" || doseType === "2a Dose" || doseType === "3a Dose" ||
            doseType === "1a Reforco" || doseType === "2a Reforco") {
            tipoText = 'Tipo';
            if (doseType === "1a Dose") doseText = '1ª Dose';
            else if (doseType === "2a Dose") doseText = '2ª Dose';
            else if (doseType === "3a Dose") doseText = '3ª Dose';
            else if (doseType === "1a Reforco") doseText = '1º Reforço';
            else if (doseType === "2a Reforco") doseText = '2º Reforço';
            
            tdDoseType.innerHTML = `<span class="dose-tipo-text">${tipoText}</span><br><span class="dose-num-text">${doseText}</span>`;
        } else {
            tdDoseType.textContent = doseType === "Dose Unica" ? "Dose Única" : doseType;
        }

        tdDoseType.style.fontWeight = 'bold'; 
        tdDoseType.style.backgroundColor = '#eef';
        tdDoseType.style.display = 'flex';
        tdDoseType.style.flexDirection = 'column';
        tdDoseType.style.justifyContent = 'center';
        tdDoseType.style.alignItems = 'center';


        row.appendChild(tdDoseType);

        vacinaNamesInOrder.forEach(vacinaName => {
            let td = document.createElement('td');
            td.classList.add('dose-cell');

            const vacinaData = vacinasRegistradasMap[vacinaName];
            let doseFound = false;
            if (vacinaData && vacinaData.doses) {
                const dose = vacinaData.doses.find(d => d.dose_aplicada === doseType);
                if (dose) {
                    if (dose.dose_aplicada === 'Faltoso') {
                        td.textContent = 'Faltoso';
                        td.classList.add('faltoso');
                    } else {
                        td.textContent = `Aplicada: ${new Date(dose.data_aplicacao).toLocaleDateString()}`;
                        td.classList.add('aplicada');
                    }
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'X';
                    deleteButton.style.marginLeft = '5px';
                    deleteButton.style.padding = '2px 5px';
                    deleteButton.style.fontSize = '0.7em';
                    deleteButton.style.backgroundColor = '#dc3545';
                    deleteButton.style.color = 'white';
                    deleteButton.style.borderRadius = '3px';
                    console.log(`Botão de exclusão criado para Vacina: ${vacinaName}, Dose: ${doseType}, ID da Vacinação: ${dose.id_vacinacao}`);
                    deleteButton.onclick = (event) => {
                        event.stopPropagation();
                        confirmDelete('vacinacao', dose.id_vacinacao);
                    };
                    td.appendChild(deleteButton);
                    doseFound = true;
                }
            }
            if (!doseFound) { 
                td.textContent = ''; 
            }
            row.appendChild(td); 
        }); 
        tbody.appendChild(row); 
    }); 
} 


// --- Funções de Ação (Adicionar/Remover) ---

async function addPessoa() {
    if (!isLoggedIn) {
        alert("Você precisa estar logado para cadastrar uma pessoa.");
        return;
    }
    const nome = document.getElementById('newPessoaNome').value;
    const identificacao = document.getElementById('newPessoaIdentificacao').value;
    const messageElement = document.getElementById('addPessoaMessage');

    console.log("-> addPessoa: Dados a serem enviados:", { nome, identificacao });

    if (!nome || !identificacao) {
        messageElement.textContent = 'Nome e Número de Identificação são obrigatórios.';
        return;
    }

    try {
        const response = await fetchData(`${API_BASE_URL}/pessoas`, 'POST', { nome: nome, numero_identificacao: identificacao });
        console.log("-> addPessoa: Resposta da API:", response);
        alert('Pessoa cadastrada com sucesso!');
        closeModal('addPessoaModal');
        document.getElementById('newPessoaNome').value = '';
        document.getElementById('newPessoaIdentificacao').value = '';
        await loadPessoas(); 
    } catch (error) {
        messageElement.textContent = error.message; 
        console.error('Erro em addPessoa:', error); 
    }
}

async function addVacina() {
    console.log("A função addVacina não é mais acionada pela interface do usuário.");
}


async function addVacinacao() {
    if (!isLoggedIn) {
        alert("Você precisa estar logado para registrar uma vacinação.");
        return;
    }
    if (!currentPessoaId) {
        alert('Por favor, selecione uma pessoa primeiro.');
        return;
    }

    const vacinaId = parseInt(document.getElementById('vacinacaoVacinaSelect').value);
    const doseAplicada = document.getElementById('vacinacaoDose').value;
    const dataAplicacao = document.getElementById('vacinacaoData').value;
    const messageElement = document.getElementById('addVacinacaoMessage');

    if (!vacinaId || !doseAplicada || !dataAplicacao) {
        messageElement.textContent = 'Todos os campos são obrigatórios para registrar a vacinação.';
        return;
    }

    if (currentCartaoData && currentCartaoData.vacinas_registradas) {
        const vacinaSelecionadaNome = allVacinas.find(v => v.id === vacinaId).nome;
        const vacinaRegistro = currentCartaoData.vacinas_registradas.find(v => v.nome_vacina === vacinaSelecionadaNome);

        const dosesAplicadasParaEstaVacina = vacinaRegistro ? vacinaRegistro.doses.map(d => d.dose_aplicada) : [];

        if (doseAplicada === '2a Dose') {
            const primeiraDoseAplicada = dosesAplicadasParaEstaVacina.includes('1a Dose');
            if (!primeiraDoseAplicada) {
                messageElement.textContent = 'Para aplicar a 2ª Dose, a 1ª Dose deve ter sido registrada primeiro.';
                return;
            }
        } else if (doseAplicada === '3a Dose') {
            const segundaDoseAplicada = dosesAplicadasParaEstaVacina.includes('2a Dose');
            if (!segundaDoseAplicada) {
                messageElement.textContent = 'Para aplicar a 3ª Dose, a 2ª Dose deve ter sido registrada primeiro.';
                return;
            }
        } else if (doseAplicada === '1a Reforco') {
            const doseAnterior = dosesAplicadasParaEstaVacina.some(d => 
                d === '3a Dose' || d === '2a Dose' || d === '1a Dose' || d === 'Dose Unica' || d === 'BCG'
            );
            if (!doseAnterior) {
                 messageElement.textContent = 'Para aplicar o 1º Reforço, uma dose anterior (1ª, 2ª, 3ª ou Dose Única) deve ter sido registrada para esta vacina.';
                 return;
            }
        } else if (doseAplicada === '2a Reforco') {
            const primeiroReforcoAplicado = dosesAplicadasParaEstaVacina.includes('1a Reforco');
            if (!primeiroReforcoAplicado) {
                messageElement.textContent = 'Para aplicar o 2º Reforço, o 1º Reforço deve ter sido registrado primeiro.';
                return;
            }
        }
    }


    const now = new Date();
    const formattedTime = now.toTimeString().split(' ')[0];
    const formattedDate = `${dataAplicacao}T${formattedTime}`;

    try {
        const response = await fetchData(`${API_BASE_URL}/vacinacoes`, 'POST', {
            pessoa_id: parseInt(currentPessoaId),
            vacina_id: vacinaId,
            dose_aplicada: doseAplicada,
            data_aplicacao: formattedDate
        });
        alert('Vacinação registrada com sucesso!');
        closeModal('addVacinacaoModal');
        await loadPessoaCartao(); 
    }  catch (error) {
        messageElement.textContent = error.message;
    }
}

function confirmDelete(type, id) {
    if (!isLoggedIn) {
        alert("Você precisa estar logado para excluir itens.");
        return;
    }
    deleteTarget = { type: type, id: id };
    let message = '';
    if (type === 'vacinacao') {
        message = 'Tem certeza que deseja excluir este registro de vacinação?';
    } else if (type === 'pessoa') {
        message = 'Tem certeza que deseja excluir esta pessoa? Todas as suas vacinações também serão excluídas.';
    } else if (type === 'vacina') {
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
            await loadPessoaCartao(); 
        } else if (deleteTarget.type === 'pessoa') {
            await fetchData(`${API_BASE_URL}/pessoas/${deleteTarget.id}`, 'DELETE');
            alert('Pessoa excluída com sucesso!');
            await loadPessoas();
            currentPessoaId = null;
            document.getElementById('pessoaSelect').value = '';
            loadPessoaCartao(); 
        } else if (deleteTarget.type === 'vacina') {
            await fetchData(`${API_BASE_URL}/vacinas/${deleteTarget.id}`, 'DELETE');
            alert('Vacina excluída com sucesso!');
            await loadVacinasForSelect();
            await loadPessoaCartao();
        }
    } catch (error) {
        alert('Erro ao excluir: ' + error.message);
    } finally {
        deleteTarget = { type: null, id: null };
    }
}

// --- Funções para Abrir Modais e Preparar Dados ---

function openAddPessoaModal() {
    if (!isLoggedIn) {
        alert("Você precisa estar logado para cadastrar uma pessoa.");
        return;
    }
    document.getElementById('newPessoaNome').value = '';
    document.getElementById('newPessoaIdentificacao').value = '';
    document.getElementById('addPessoaMessage').textContent = '';
    showModal('addPessoaModal');
}

async function openAddVacinacaoModal() {
    if (!isLoggedIn) {
        alert("Você precisa estar logado para registrar uma vacinação.");
        return;
    }
    if (!currentPessoaId) {
        alert('Por favor, selecione uma pessoa primeiro.');
        return;
    }
    document.getElementById('vacinacaoPessoaNome').textContent = document.getElementById('currentPessoaNome').textContent;
    document.getElementById('addVacinacaoMessage').textContent = '';
    await loadVacinasForSelect();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('vacinacaoData').value = today;
    showModal('addVacinacaoModal');
}

// Função para exportar dados do cartão de vacinação para CSV
function exportCartaoVacinacaoToCsv() {
    console.log("-> exportCartaoVacinacaoToCsv: Função iniciada.");
    console.log("Estado atual: currentPessoaId:", currentPessoaId, "currentCartaoData:", currentCartaoData);

    if (!currentCartaoData || !currentPessoaId) {
        alert('Selecione uma pessoa e carregue o cartão de vacinação primeiro para exportar.');
        console.error("-> exportCartaoVacinacaoToCsv: Dados do cartão ou ID da pessoa ausentes para exportação.");
        return;
    }

    const pessoa = currentCartaoData.pessoa;
    const vacinasRegistradas = currentCartaoData.vacinas_registradas;

    let csvContent = "";

    console.log("-> exportCartaoVacinacaoToCsv: currentCategory:", currentCategory);
    const vacinasExibirNestaCategoriaCsv = allVacinas.filter(vac => vac.categoria === currentCategory);
    const vacinaNamesInOrderCsv = vacinasExibirNestaCategoriaCsv.map(vac => vac.nome);

    console.log("-> exportCartaoVacinacaoToCsv: vacinaNamesInOrderCsv (colunas do CSV):", vacinaNamesInOrderCsv);

    let headerRow = "Dose/Vacina";
    vacinaNamesInOrderCsv.forEach(vacinaName => {
        headerRow += `;"${vacinaName}"`; // Separador de ponto e vírgula, com aspas para nomes com espaços
    });
    csvContent += headerRow + "\n";

    const dosesTypes = [
        "1a Dose", "2a Dose", "3a Dose",
        "1a Reforco", "2a Reforco",
        "Dose Unica", "BCG", "Faltoso", "4a Dose", "5a Dose"
    ];

    dosesTypes.forEach(doseType => {
        let rowData = ''; 
        let displayDoseTypeCsv = ''; 

        if (doseType === "1a Dose") displayDoseTypeCsv = "Tipo 1ª Dose";
        else if (doseType === "2a Dose") displayDoseTypeCsv = "Tipo 2ª Dose";
        else if (doseType === "3a Dose") displayDoseTypeCsv = "Tipo 3ª Dose";
        else if (doseType === "1a Reforco") displayDoseTypeCsv = "Tipo 1º Reforço";
        else if (doseType === "2a Reforco") displayDoseTypeCsv = "Tipo 2º Reforço";
        else if (doseType === "Dose Unica") displayDoseTypeCsv = "Dose Única";
        else displayDoseTypeCsv = doseType; 
            
        rowData = `"${displayDoseTypeCsv}"`; // Coloca o nome da dose entre aspas
        
        vacinaNamesInOrderCsv.forEach(vacinaName => {
            const vacinaData = vacinasRegistradas.find(v => v.nome_vacina === vacinaName);
            let cellContent = "";
            if (vacinaData && vacinaData.doses) {
                const dose = vacinaData.doses.find(d => d.dose_aplicada === doseType);
                if (dose) {
                    if (dose.dose_aplicada === 'Faltoso') {
                        cellContent = 'Faltoso';
                    } else {
                        cellContent = `Aplicada: ${new Date(dose.data_aplicacao).toLocaleDateString()}`;
                    }
                }
            }
            rowData += `;"${cellContent}"`; // Adiciona ponto e vírgula e aspas para o conteúdo da célula
        });
        csvContent += rowData + "\n";
    });

    // Informações da Pessoa no final do CSV para clareza
    csvContent += "\n";
    csvContent += `Informações da Pessoa;\n`; // Linha de cabeçalho
    csvContent += `Nome;${pessoa.nome}\n`;
    csvContent += `ID;${pessoa.id}\n`;
    csvContent += `Identificação;${pessoa.numero_identificacao}\n`;

    console.log("-> exportCartaoVacinacaoToCsv: Conteúdo CSV gerado:\n", csvContent);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); // type de volta para text/csv
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `cartao_vacinacao_${pessoa.nome.replace(/\s/g, '_')}_${pessoa.id}.csv`); // Extensão de volta para .csv
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("-> exportCartaoVacinacaoToCsv: Download do CSV disparado.");
    } else {
        alert('Seu navegador não suporta download direto de arquivos. Por favor, copie o conteúdo.');
        console.error("-> exportCartaoVacinacaoToCsv: Navegador não suporta download direto.");
    }
}

// Função para lidar com a seleção de categorias nas abas
function selectCategory(category, clickedTabElement) {
    currentCategory = category; 

    document.querySelectorAll('.tab-menu .tab-item').forEach(tab => {
        tab.classList.remove('active');
    });

    clickedTabElement.classList.add('active');

    if (currentPessoaId) {
        loadPessoaCartao(); 
    } else {
        const vacinasTable = document.getElementById('vacinasTable');
        vacinasTable.querySelector('thead').innerHTML = '';
        vacinasTable.querySelector('tbody').innerHTML = '';
        renderCartaoVacinacaoTable([]);
    }
}