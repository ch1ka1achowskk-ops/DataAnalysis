const select = document.getElementById('indicator-select');
const viewContainer = document.getElementById('view-container');

const DATA_FILES = {
    'prognoz_EGE.json': { unit: 'балла', name: 'Средний балл ЕГЭ' },
    'prognoz_Studenti.json': { unit: 'студентов', name: 'Общая численность студентов' },
    'prognoz_NIOKR.json': { unit: 'руб.', name: 'Объем НИОКР' },
    'prognoz_Publikacii.json': { unit: 'публикаций', name: 'Число публикаций' },
    'prognoz_UchenieStepeni.json': { unit: '%', name: 'Доля ППС с ученой степенью' },
    'prognoz_Zarplata.json': { unit: 'руб.', name: 'Средняя зарплата ППС' },
    'prognoz_Inostranci.json': { unit: 'студентов', name: 'Иностранные студенты' },
    'prognoz_Obshejitia.json': { unit: 'кв. м.', name: 'Площадь общежитий' },
    'prognoz_Dohodi.json': { unit: 'руб.', name: 'Доходы вуза' },
    'prognoz_DohodiVnebajet.json': { unit: '%', name: 'Доля внебюджетных доходов' }
};
const fileNames = Object.keys(DATA_FILES);

const twoColumnLayout = `
    <div class="results-grid">
        <div class="results-column card">
            <h2 id="growing-title">📈 Растущие ВУЗы</h2>
            <div id="growing-container" class="results-list">
                <p class="loading">Загрузка...</p>
            </div>
        </div>
        <div class="results-column card">
            <h2 id="falling-title">📉 Падающие ВУЗы</h2>
            <div id="falling-container" class="results-list">
                <p class="loading">Загрузка...</p>
            </div>
        </div>
    </div>
    <div id="zero-container" class="card zero-list" style="display: none;"></div>
`;

async function calculateAndShowTotalScore(unit) {
    viewContainer.innerHTML = twoColumnLayout; 
    
    document.getElementById('growing-title').innerText = '📈 Положительный балл';
    document.getElementById('falling-title').innerText = '📉 Отрицательный балл';

    const growingContainer = document.getElementById('growing-container');
    const fallingContainer = document.getElementById('falling-container');
    const zeroContainer = document.getElementById('zero-container');
    zeroContainer.style.display = 'none'; 

    growingContainer.innerHTML = '<p class="loading">Расчет итогового балла...</p>';
    fallingContainer.innerHTML = '<p class="loading">Это может занять несколько секунд...</p>';
    
    try {
        const responses = await Promise.all(fileNames.map(file => fetch(file)));
        const allData = await Promise.all(responses.map(res => res.json()));

        const stats = allData.map(dataset => {
            const forecasts = dataset.map(vuz => vuz.forecast).filter(f => !isNaN(f) && f > -Infinity && f < Infinity);
            return {
                min: Math.min(...forecasts),
                max: Math.max(...forecasts),
                range: Math.max(...forecasts) - Math.min(...forecasts)
            };
        });

        const vuzScores = new Map();
        allData.forEach((dataset, index) => {
            const { min, range } = stats[index];
            dataset.forEach(vuz => {
                if (!vuzScores.has(vuz.id)) {
                    vuzScores.set(vuz.id, { name: vuz.name, scores: [], slopes: [] });
                }
                
                let normScore = 0;
                if (range > 0) {
                    normScore = ((vuz.forecast - min) / range) * 100;
                }
                vuzScores.get(vuz.id).scores.push(normScore);
                vuzScores.get(vuz.id).slopes.push(vuz.slope);
            });
        });

        const finalResults = [];
        vuzScores.forEach((vuz, id) => {
            const avgScore = vuz.scores.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0) / vuz.scores.length;
            const slopeBonus = vuz.slopes.reduce((a, s) => a + (s > 0.01 ? 10 : (s < -0.01 ? -10 : 0)), 0);
            const totalScore = avgScore + slopeBonus;
            
            finalResults.push({ id, name: vuz.name, forecast: totalScore });
        });

        const positiveVuzs = finalResults.filter(vuz => vuz.forecast > 0);
        const negativeVuzs = finalResults.filter(vuz => vuz.forecast <= 0);

        renderList(growingContainer, positiveVuzs, unit, 'growing');
        renderList(fallingContainer, negativeVuzs, unit, 'falling');

    } catch (error) {
        console.error('Ошибка при расчете общего балла:', error);
        viewContainer.innerHTML = `<p class="loading" style="color: red;">Ошибка: ${error.message}</p>`;
    }
}

async function loadSingleIndicator(fileName, unit) {
    viewContainer.innerHTML = twoColumnLayout; 
    document.getElementById('growing-title').innerText = '📈 Растущие ВУЗы';
    document.getElementById('falling-title').innerText = '📉 Падающие ВУЗы';

    const growingContainer = document.getElementById('growing-container');
    const fallingContainer = document.getElementById('falling-container');
    const zeroContainer = document.getElementById('zero-container');

    try {
        const response = await fetch(fileName);
        if (!response.ok) {
            throw new Error(`Не удалось загрузить файл: ${fileName}`);
        }
        const data = await response.json();

        const realisticData = data.filter(vuz => {
            if (unit === 'балла' && vuz.forecast > 100) return false;
            return true;
        });

        const growingVuzs = realisticData.filter(vuz => vuz.slope > 0.01 && vuz.forecast > 0);
        const fallingVuzs = realisticData.filter(vuz => vuz.slope < -0.01 || vuz.forecast < 0);
        const zeroVuzs = realisticData.filter(vuz => !growingVuzs.includes(vuz) && !fallingVuzs.includes(vuz));

        renderList(growingContainer, growingVuzs, unit, 'growing');
        renderList(fallingContainer, fallingVuzs, unit, 'falling');
        
        if(zeroVuzs.length > 0) {
            zeroContainer.style.display = 'block';
            zeroContainer.innerHTML = '<h2>⚪️ ВУЗы со стабильным или нулевым прогнозом</h2>';
            renderList(zeroContainer, zeroVuzs, unit, 'stable');
        } else {
            zeroContainer.style.display = 'none';
        }

    } catch (error) {
        console.error('Ошибка:', error);
        growingContainer.innerHTML = `<p class="loading" style="color: red;">Ошибка: ${error.message}</p>`;
        fallingContainer.innerHTML = '';
    }
}

function renderList(container, vuzs, unit, trend) {
    if (vuzs.length === 0) {
        container.innerHTML = '<p class="loading">Нет данных</p>';
        return;
    }
    if (trend === 'growing') {
        vuzs.sort((a, b) => b.forecast - a.forecast);
    } else {
        vuzs.sort((a, b) => a.forecast - b.forecast);
    }
    container.innerHTML = '';
    vuzs.forEach(vuz => {
        const item = document.createElement('div');
        item.className = 'result-item';
        let formattedForecast;
        if (unit === 'баллов') {
             formattedForecast = vuz.forecast.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
        } else {
             formattedForecast = vuz.forecast.toLocaleString('ru-RU');
        }

        let trendIcon = '';
        let trendClass = '';
        if (trend === 'growing') {
            trendIcon = '<span class="trend-icon">▲</span>';
            trendClass = 'forecast-growing';
        } else if (trend === 'falling') {
            trendIcon = '<span class="trend-icon">▼</span>';
            trendClass = 'forecast-falling';
        } else {
            trendIcon = '<span class="trend-icon">●</span>';
            trendClass = 'forecast-stable';
        }
        item.innerHTML = `
            <span class="vuz-name">${vuz.name}</span>
            <span class="vuz-forecast ${trendClass}">
                ${trendIcon}
                ${formattedForecast} ${unit}
            </span>
        `;
        container.appendChild(item);
    });
}

function handleSelection() {
    const selectedOption = select.options[select.selectedIndex];
    const fileName = selectedOption.value;
    const unit = selectedOption.dataset.unit;

    if (fileName === 'prognoz_Total') {
        calculateAndShowTotalScore(unit);
    } else {
        loadSingleIndicator(fileName, unit);
    }
}

select.addEventListener('change', handleSelection);
handleSelection();