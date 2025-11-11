const select = document.getElementById('indicator-select');
const growingContainer = document.getElementById('growing-container');
const fallingContainer = document.getElementById('falling-container');
const zeroContainer = document.getElementById('zero-container');

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
        
        const formattedForecast = vuz.forecast.toLocaleString('ru-RU');
        
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

async function loadForecastData(fileName, unit) {
    const loadingHTML = '<p class="loading">Загрузка...</p>';
    growingContainer.innerHTML = loadingHTML;
    fallingContainer.innerHTML = loadingHTML;
    zeroContainer.innerHTML = '';
    zeroContainer.style.display = 'none';

    try {
        const response = await fetch(fileName);
        if (!response.ok) {
            throw new Error(`Не удалось загрузить файл: ${fileName}`);
        }
        const data = await response.json();

        // Убираем нереалистичные прогнозы (например, балл ЕГЭ > 100)
        // Но оставляем отрицательные - это явный тренд на падение
        const realisticData = data.filter(vuz => {
            if (unit === 'балла' && vuz.forecast > 100) return false;
            return true;
        });

        // Делим на 3 группы
        const growingVuzs = realisticData.filter(vuz => vuz.slope > 0.01 && vuz.forecast > 0);
        const fallingVuzs = realisticData.filter(vuz => vuz.slope < -0.01 || vuz.forecast < 0);
        const zeroVuzs = realisticData.filter(vuz => !growingVuzs.includes(vuz) && !fallingVuzs.includes(vuz));

        renderList(growingContainer, growingVuzs, unit, 'growing');
        renderList(fallingContainer, fallingVuzs, unit, 'falling');
        
        if(zeroVuzs.length > 0) {
            zeroContainer.style.display = 'block';
            zeroContainer.innerHTML = '<h2>⚪️ ВУЗы со стабильным или нулевым прогнозом</h2>';
            renderList(zeroContainer, zeroVuzs, unit, 'stable');
        }

    } catch (error) {
        console.error('Ошибка:', error);
        growingContainer.innerHTML = `<p class="loading" style="color: red;">Ошибка: ${error.message}</p>`;
        fallingContainer.innerHTML = '';
    }
}

select.addEventListener('change', (event) => {
    const selectedOption = event.target.options[event.target.selectedIndex];
    const fileName = selectedOption.value;
    const unit = selectedOption.dataset.unit;
    loadForecastData(fileName, unit);
});

// Запускаем при первой загрузке
const initialOption = select.options[select.selectedIndex];
loadForecastData(initialOption.value, initialOption.dataset.unit);