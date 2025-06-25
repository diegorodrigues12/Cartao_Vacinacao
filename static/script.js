// ... (restante do script.js antes de renderCartaoVacinacaoTable) ...

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
                    deleteButton.onclick = (event) => {
                        event.stopPropagation();
                        confirmDelete('vacinacao', dose.id);
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

// ... (restante do script.js após renderCartaoVacinacaoTable) ...

// Além disso, na função `addVacina` (que agora não tem botão de acionamento, mas a função ainda existe),
// a linha `await loadVacinasForSelect();` pode ser removida se quiser,
// pois as vacinas já estão pré-carregadas. Ou mantida por segurança.
// Como o botão foi removido, essa função `addVacina` não será mais chamada pela UI.
// Se você não for usar a rota POST /vacinas para nada, ela pode ser removida do app.py também.