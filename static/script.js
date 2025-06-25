// cartao_vacinacao_api/static/script.js

const API_BASE_URL = 'http://127.0.0.1:5000'; // Endereço da sua API Flask

let currentPessoaId = null;
let allVacinas = []; // Para armazenar TODAS as vacinas disponíveis (sem filtro de categoria)
let deleteTarget = { type: null, id: null }; // Para o modal de confirmação de exclusão
let currentCartaoData = null; // Para armazenar os dados do cartão de vacinação atual
let currentCategory = 'Nacional'; // Categoria ativa padrão (primeira aba)

document.addEventListener('DOMContentLoaded', () => {
    loadPessoas(); // Carrega as pessoas ao carregar a página
    // No carregamento inicial, ative a aba "Nacional" visualmente
    const defaultTab = document.querySelector('.tab-item[data-category="Nacional"]');
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
        // Esconde o botão de exclusão de pessoa se não houver pessoa selecionada
        document.getElementById('deletePessoaButton').style.display = 'none';
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
    const deletePessoaButton = document.getElementById('deletePessoaButton'); // Referência ao botão

    if (!currentPessoaId) {
        cartaoSection.style.display = 'none';
        currentPessoaNomeSpan.textContent = '';
        currentPessoaIdSpan.textContent = '';
        currentPessoaIdentificacaoSpan.textContent = '';
        currentCartaoData = null; // Limpa os dados do cartão quando nenhuma pessoa está selecionada
        deletePessoaButton.style.display = 'none'; // Oculta o botão se nada estiver selecionado
        return;
    }

    try {
        currentCartaoData = await fetchData(`${API_BASE_URL}/pessoas/${currentPessoaId}/cartao_vacinacao`); // Armazena os dados
        const pessoa = currentCartaoData.pessoa;
        const vacinasRegistradas = currentCartaoData.vacinas_registradas;

        currentPessoaNomeSpan.textContent = pessoa.nome;
        currentPessoaIdSpan.textContent = pessoa.id;
        currentPessoaIdentificacaoSpan.textContent = pessoa.numero_identificacao;
        cartaoSection.style.display = 'block';
        deletePessoaButton.style.display = 'inline-block'; // Mostra o botão quando a pessoa está selecionada

        // Carrega TODAS as vacinas (sem filtro) para 'allVacinas' que será usado para filtragem local
        await loadVacinasForSelect(); 

        // Renderiza a tabela com a categoria atual (padrão 'Nacional' ou a selecionada)
        renderCartaoVacinacaoTable(vacinasRegistradas);

    } catch (error) {
        console.error('Erro ao carregar cartão de vacinação:', error);
        alert('Erro ao carregar cartão de vacinação. Verifique se a pessoa existe ou se há um erro na API.');
        cartaoSection.style.display = 'none';
        currentCartaoData = null; // Limpa os dados em caso de erro
        deletePessoaButton.style.display = 'none'; // Oculta o botão em caso de erro
    }
}

async function loadVacinasForSelect() {
    try {
        // allVacinas pega TODAS as vacinas sem filtro de categoria
        allVacinas = await fetchData(`${API_BASE_URL}/vacinas`); 
        const vacinaSelect = document.getElementById('vacinacaoVacinaSelect');
        vacinaSelect.innerHTML = ''; // Limpa as opções existentes

        // Adiciona um valor padrão ao select
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
                    
                    // console.log para depurar o ID da dose
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

async function addVacina() {
    console.log("A função addVacina não é mais acionada pela interface do usuário.");
}


async function addVacinacao() {
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

    // VALIDAÇÃO: SEGUNDA DOSE DEPENDE DA PRIMEIRA
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
        await fetchData(`${API_BASE_URL}/vacinacoes`, 'POST', {
            pessoa_id: parseInt(currentPessoaId),
            vacina_id: vacinaId,
            dose_aplicada: doseAplicada,
            data_aplicacao: formattedDate
        });
        alert('Vacinação registrada com sucesso!');
        closeModal('addVacinacaoModal');
        await loadPessoaCartao(); // Recarregar o cartão da pessoa
    }  catch (error) {
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
            await loadPessoas();
            currentPessoaId = null;
            document.getElementById('pessoaSelect').value = '';
            loadPessoaCartao(); // Limpar informações do cartão
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
    document.getElementById('newPessoaNome').value = '';
    document.getElementById('newPessoaIdentificacao').value = '';
    document.getElementById('addPessoaMessage').textContent = '';
    showModal('addPessoaModal');
}

async function openAddVacinacaoModal() {
    if (!currentPessoaId) {
        alert('Por favor, selecione uma pessoa primeiro para registrar uma vacinação.');
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
    console.log("Iniciando exportCartaoVacinacaoToCsv..."); // Log de início
    if (!currentCartaoData || !currentPessoaId) {
        alert('Selecione uma pessoa e carregue o cartão de vacinação primeiro para exportar.');
        console.error("Dados do cartão ou ID da pessoa ausentes para exportação."); // Log de erro
        return;
    }

    const pessoa = currentCartaoData.pessoa;
    const vacinasRegistradas = currentCartaoData.vacinas_registradas;

    let csvContent = "";

    // Cabeçalho CSV
    console.log("currentCategory:", currentCategory); // Log da categoria atual
    const vacinasExibirNestaCategoriaCsv = allVacinas.filter(vac => {
        console.log(`Vacina: ${vac.nome}, Categoria: ${vac.categoria}, Current Category: ${currentCategory}`); // Log de filtragem
        return vac.categoria === currentCategory;
    });
    const vacinaNamesInOrderCsv = vacinasExibirNestaCategoriaCsv.map(vac => vac.nome);

    console.log("vacinaNamesInOrderCsv (colunas do CSV):", vacinaNamesInOrderCsv); // Log das colunas

    let headerRow = "Dose/Vacina";
    vacinaNamesInOrderCsv.forEach(vacinaName => {
        headerRow += `;${vacinaName}`;
    });
    csvContent += headerRow + "\n";

    // Mapeamento de doses para CSV (usando a mesma ordem de exibição da tabela)
    const dosesTypes = [
        "1a Dose", "2a Dose", "3a Dose",
        "1a Reforco", "2a Reforco",
        "Dose Unica", "BCG", "Faltoso", "4a Dose", "5a Dose"
    ];

    dosesTypes.forEach(doseType => {
        let displayDoseTypeCsv = '';
        if (doseType === "1a Dose") displayDoseTypeCsv = "Tipo 1ª Dose";
        else if (doseType === "2a Dose") displayDoseTypeCsv = "Tipo 2ª Dose";
        else if (doseType === "3a Dose") displayDoseTypeCsv = "Tipo 3ª Dose";
        else if (doseType === "1a Reforco") displayDoseTypeCsv = "Tipo 1º Reforço";
        else if (doseType === "2a Reforco") displayDoseTypeCsv = "Tipo 2º Reforço";
        else if (doseType === "Dose Unica") displayDoseTypeCsv = "Dose Única";
        else displayDoseTypeCsv = doseType; 
            
        let rowData = `"${displayDoseTypeCsv}"`;
        vacinaNamesInOrderCsv.forEach(vacinaName => {
            // Garante que estamos procurando a vacina DATA dentro do CONJUNTO COMPLETO de vacinas registradas
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
            rowData += `;"${cellContent}"`;
        });
        csvContent += rowData + "\n";
    });

    // Informações da Pessoa no final do CSV para clareza
    csvContent += "\n";
    csvContent += `Informações da Pessoa;\n`;
    csvContent += `Nome:;${pessoa.nome}\n`;
    csvContent += `ID:;${pessoa.id}\n`;
    csvContent += `Identificação:;${pessoa.numero_identificacao}\n`;

    console.log("Conteúdo CSV gerado:\n", csvContent); // Log do conteúdo final

    // Cria um Blob e dispara o download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `cartao_vacinacao_${pessoa.nome.replace(/\s/g, '_')}_${pessoa.id}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Download do CSV disparado."); // Log de sucesso
    } else {
        alert('Seu navegador não suporta download direto de arquivos. Por favor, copie o conteúdo.');
        console.error("Navegador não suporta download direto."); // Log de erro
    }
}

// Função para lidar com a seleção de categorias nas abas
function selectCategory(category, clickedTabElement) {
    currentCategory = category; // Atualiza a categoria global

    // Remove a classe 'active' de todas as abas
    document.querySelectorAll('.tab-menu .tab-item').forEach(tab => {
        tab.classList.remove('active');
    });

    // Adiciona a classe 'active' à aba clicada
    clickedTabElement.classList.add('active');

    // Recarrega o cartão de vacinação para aplicar o filtro da nova categoria
    if (currentPessoaId) {
        loadPessoaCartao(); // loadPessoaCartao já chama renderCartaoVacinacaoTable com a categoria atual
    } else {
        // Se não houver pessoa selecionada, limpa a tabela ou exibe mensagem
        const vacinasTable = document.getElementById('vacinasTable');
        vacinasTable.querySelector('thead').innerHTML = '';
        vacinasTable.querySelector('tbody').innerHTML = '';
        // Também limpa o cabeçalho de vacinas se a pessoa não estiver selecionada
        renderCartaoVacinacaoTable([]); // Renderiza com array vazio para limpar colunas de vacinas
    }
}
