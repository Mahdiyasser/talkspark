// script.js - Part 1 of 4

let categories = [];
let allPoints = {};
let totalPointsCount = 0;

async function loadCategories() {
    try {
        const response = await fetch('./data/cat.json');
        categories = await response.json();
        await loadAllPoints();
        updateDynamicCounts();
        renderCategoriesGrid();
        renderCategoryPreview();
        populateCategoryList();
        initAPIBuilder();
        initAppTab();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadAllPoints() {
    for (const cat of categories) {
        try {
            const response = await fetch(`./data/${cat.file}`);
            allPoints[cat.id] = await response.json();
            totalPointsCount += allPoints[cat.id].length;
        } catch (error) {
            console.error(`Error loading ${cat.file}:`, error);
        }
    }
}

function updateDynamicCounts() {
    const categoryCount = categories.length;
    
    document.getElementById('homeCategoryCount').textContent = categoryCount;
    document.getElementById('statCategories').textContent = categoryCount;
    document.getElementById('statPoints').textContent = totalPointsCount;
    document.getElementById('featureCategoryCount').textContent = categoryCount;
    document.getElementById('storyCategoryCount').textContent = categoryCount;
}

function renderCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = categories.map(cat => {
        const count = allPoints[cat.id] ? allPoints[cat.id].length : 0;
        return `
            <div class="category-card" data-category-id="${cat.id}">
                <h3>${cat.name}</h3>
                <p>${count} conversation starters</p>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const catId = parseInt(card.dataset.categoryId);
            showCategoryPoints(catId);
        });
    });
}

function renderCategoryPreview() {
    const grid = document.getElementById('categoryPreviewGrid');
    grid.innerHTML = categories.slice(0, 6).map(cat => {
        const count = allPoints[cat.id] ? allPoints[cat.id].length : 0;
        return `
            <div class="category-card" data-category-id="${cat.id}" data-navigate="discover">
                <h3>${cat.name}</h3>
                <p>${count} topics</p>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.category-card[data-navigate]').forEach(card => {
        card.addEventListener('click', () => {
            switchTab('discover');
            setTimeout(() => {
                const catId = parseInt(card.dataset.categoryId);
                showCategoryPoints(catId);
            }, 100);
        });
    });
}

let currentCategoryId = null;
let allCategoryPoints = [];

function showCategoryPoints(catId) {
    currentCategoryId = catId;
    const category = categories.find(c => c.id === catId);
    const points = allPoints[catId] || [];
    allCategoryPoints = points;

    document.getElementById('categoriesGrid').style.display = 'none';
    document.getElementById('pointsView').style.display = 'block';
    document.getElementById('categoryTitle').textContent = category.name;
    document.getElementById('categorySearchInput').value = '';

    renderPointsList(points);
}

function renderPointsList(points) {
    const pointsList = document.getElementById('pointsList');
    pointsList.innerHTML = points.map(point => `
        <div class="point-card">
            <h4>${point.name}</h4>
            <p>${point['the-point']}</p>
            <p class="point-context">${point.context}</p>
        </div>
    `).join('');
}

document.getElementById('backBtn')?.addEventListener('click', () => {
    document.getElementById('categoriesGrid').style.display = 'grid';
    document.getElementById('pointsView').style.display = 'none';
    document.getElementById('discoverSearchInput').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    renderCategoriesGrid();
});

document.getElementById('categorySearchInput')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (!query) {
        renderPointsList(allCategoryPoints);
        return;
    }

    const filtered = allCategoryPoints.filter(point => {
        return point.name.toLowerCase().includes(query) ||
               point['the-point'].toLowerCase().includes(query) ||
               point.context.toLowerCase().includes(query);
    });

    renderPointsList(filtered);
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const tab = link.dataset.tab;
        switchTab(tab);
    });
});

document.querySelectorAll('[data-navigate]').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.navigate;
        switchTab(tab);
    });
});

function switchTab(tabName) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
    const activeTab = document.getElementById(tabName);

    if (activeLink) activeLink.classList.add('active');
    if (activeTab) activeTab.classList.add('active');

    if (tabName === 'discover') {
        document.getElementById('categoriesGrid').style.display = 'grid';
        document.getElementById('pointsView').style.display = 'none';
    }
}

document.getElementById('homeSearchBtn')?.addEventListener('click', performHomeSearch);
document.getElementById('homeSearchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performHomeSearch();
});

function performHomeSearch() {
    const query = document.getElementById('homeSearchInput').value.toLowerCase();
    if (!query) return;

    const results = [];
    categories.forEach(cat => {
        const points = allPoints[cat.id] || [];
        points.forEach(point => {
            if (point.name.toLowerCase().includes(query) ||
                point['the-point'].toLowerCase().includes(query) ||
                point.context.toLowerCase().includes(query)) {
                results.push({ ...point, category: cat.name, categoryId: cat.id });
            }
        });
    });

    displayHomeSearchResults(results);
}

function displayHomeSearchResults(results) {
    const container = document.getElementById('homeSearchResults');
    
    if (results.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No results found. Try a different search term.</p>';
        return;
    }

    container.innerHTML = results.slice(0, 10).map(point => `
        <div class="point-card">
            <h4>${point.name}</h4>
            <p>${point['the-point']}</p>
            <p class="point-context">${point.context} • ${point.category}</p>
        </div>
    `).join('');
}

// script.js - Part 2 of 4

document.getElementById('discoverSearchInput')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    
    if (!query) {
        document.getElementById('clearSearchBtn').style.display = 'none';
        renderCategoriesGrid();
        return;
    }

    document.getElementById('clearSearchBtn').style.display = 'block';
    
    const matchingCategories = [];
    categories.forEach(cat => {
        const points = allPoints[cat.id] || [];
        const matchingPoints = points.filter(point => {
            return point.name.toLowerCase().includes(query) ||
                   point['the-point'].toLowerCase().includes(query) ||
                   point.context.toLowerCase().includes(query);
        });

        if (matchingPoints.length > 0) {
            matchingCategories.push({
                ...cat,
                matchCount: matchingPoints.length
            });
        }
    });

    const grid = document.getElementById('categoriesGrid');
    if (matchingCategories.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1;">No matching topics found.</p>';
        return;
    }

    grid.innerHTML = matchingCategories.map(cat => {
        return `
            <div class="category-card" data-category-id="${cat.id}">
                <h3>${cat.name}</h3>
                <p>${cat.matchCount} matching topics</p>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const catId = parseInt(card.dataset.categoryId);
            showCategoryPoints(catId);
            setTimeout(() => {
                document.getElementById('categorySearchInput').value = query;
                document.getElementById('categorySearchInput').dispatchEvent(new Event('input'));
            }, 100);
        });
    });
});

document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
    document.getElementById('discoverSearchInput').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    renderCategoriesGrid();
});

function initAPIBuilder() {
    const typeSelect = document.getElementById('endpointType');
    typeSelect.addEventListener('change', () => {
        renderAPIControls(typeSelect.value);
    });

    renderAPIControls('random');
}

function renderAPIControls(type) {
    const controls = document.getElementById('apiBuilderControls');
    
    switch(type) {
        case 'random':
            controls.innerHTML = '<p style="color: var(--text-muted);">This endpoint returns a random topic from all categories. No additional configuration needed.</p>';
            updateEndpoint('/?talk');
            break;

        case 'category':
            controls.innerHTML = `
                <div class="control-group">
                    <label>Select Category</label>
                    <select id="categorySelect">
                        ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                    </select>
                </div>
            `;
            document.getElementById('categorySelect').addEventListener('change', (e) => {
                updateEndpoint(`/?c=${e.target.value}`);
            });
            updateEndpoint(`/?c=${categories[0].id}`);
            break;

        case 'categories':
            controls.innerHTML = `
                <div class="control-group">
                    <label>Select Multiple Categories</label>
                    <div class="checkbox-group" id="multiCatCheckboxes">
                        ${categories.map(cat => `
                            <div class="checkbox-item">
                                <input type="checkbox" id="cat-${cat.id}" value="${cat.id}">
                                <label for="cat-${cat.id}">${cat.name}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            document.querySelectorAll('#multiCatCheckboxes input').forEach(cb => {
                cb.addEventListener('change', updateMultiCategoryEndpoint);
            });
            updateEndpoint('/?c=1&2&3');
            break;

        case 'specific':
            controls.innerHTML = `
                <div class="control-group">
                    <label>Select Category</label>
                    <select id="specificCatSelect">
                        ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                    </select>
                </div>
                <div class="control-group">
                    <label>Select Point</label>
                    <select id="specificPointSelect"></select>
                </div>
            `;
            
            const catSelect = document.getElementById('specificCatSelect');
            const pointSelect = document.getElementById('specificPointSelect');
            
            function updatePointSelect() {
                const catId = parseInt(catSelect.value);
                const points = allPoints[catId] || [];
                pointSelect.innerHTML = points.map(p => 
                    `<option value="${p.id}">${p.name}</option>`
                ).join('');
                updateSpecificEndpoint();
            }
            
            function updateSpecificEndpoint() {
                updateEndpoint(`/?c=${catSelect.value}&&p=${pointSelect.value}`);
            }
            
            catSelect.addEventListener('change', updatePointSelect);
            pointSelect.addEventListener('change', updateSpecificEndpoint);
            updatePointSelect();
            break;

        case 'points':
            controls.innerHTML = `
                <div class="control-group">
                    <label>Select Category</label>
                    <select id="pointsCatSelect">
                        ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                    </select>
                </div>
                <div class="control-group">
                    <label>Select Points</label>
                    <div class="checkbox-group" id="pointsCheckboxes"></div>
                </div>
            `;
            
            const pCatSelect = document.getElementById('pointsCatSelect');
            const pCheckboxes = document.getElementById('pointsCheckboxes');
            
            function updatePointCheckboxes() {
                const catId = parseInt(pCatSelect.value);
                const points = allPoints[catId] || [];
                pCheckboxes.innerHTML = points.map(p => `
                    <div class="checkbox-item">
                        <input type="checkbox" id="point-${p.id}" value="${p.id}">
                        <label for="point-${p.id}">${p.name}</label>
                    </div>
                `).join('');
                
                document.querySelectorAll('#pointsCheckboxes input').forEach(cb => {
                    cb.addEventListener('change', updatePointsEndpoint);
                });
            }
            
            function updatePointsEndpoint() {
                const selected = Array.from(document.querySelectorAll('#pointsCheckboxes input:checked'))
                    .map(cb => cb.value);
                if (selected.length > 0) {
                    updateEndpoint(`/?c=${pCatSelect.value}&&p=${selected.join('&')}`);
                }
            }
            
            pCatSelect.addEventListener('change', updatePointCheckboxes);
            updatePointCheckboxes();
            break;

// script.js - Part 3 of 4

        case 'multi':
            controls.innerHTML = `
                <div id="multiCategoryContainer"></div>
                <button class="btn btn-secondary" id="addCategoryBtn" style="margin-top: 1rem;">Add Category</button>
            `;
            
            let multiCategories = [];
            
            function addMultiCategory() {
                const index = multiCategories.length + 1;
                multiCategories.push({ id: index, category: categories[0].id, points: [] });
                renderMultiCategories();
            }
            
            function renderMultiCategories() {
                const container = document.getElementById('multiCategoryContainer');
                container.innerHTML = multiCategories.map((mc, idx) => `
                    <div class="control-group" style="border: 1px solid var(--border); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <label>Category ${mc.id}</label>
                        <select id="multiCat${mc.id}" data-index="${idx}">
                            ${categories.map(cat => `<option value="${cat.id}" ${cat.id == mc.category ? 'selected' : ''}>${cat.name}</option>`).join('')}
                        </select>
                        <label style="margin-top: 0.5rem;">Points (optional)</label>
                        <div class="checkbox-group" id="multiPoints${mc.id}"></div>
                        <button class="btn btn-secondary" onclick="removeMultiCategory(${idx})" style="margin-top: 0.5rem; padding: 0.5rem 1rem;">Remove</button>
                    </div>
                `).join('');
                
                multiCategories.forEach((mc, idx) => {
                    const select = document.getElementById(`multiCat${mc.id}`);
                    select.addEventListener('change', (e) => {
                        multiCategories[idx].category = parseInt(e.target.value);
                        updateMultiPointsCheckboxes(mc.id, idx);
                    });
                    updateMultiPointsCheckboxes(mc.id, idx);
                });
            }
            
            function updateMultiPointsCheckboxes(mcId, idx) {
                const catId = multiCategories[idx].category;
                const points = allPoints[catId] || [];
                const container = document.getElementById(`multiPoints${mcId}`);
                container.innerHTML = points.map(p => `
                    <div class="checkbox-item">
                        <input type="checkbox" id="mp${mcId}-${p.id}" value="${p.id}" data-index="${idx}">
                        <label for="mp${mcId}-${p.id}">${p.name}</label>
                    </div>
                `).join('');
                
                container.querySelectorAll('input').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const index = parseInt(e.target.dataset.index);
                        const selected = Array.from(container.querySelectorAll('input:checked'))
                            .map(c => c.value);
                        multiCategories[index].points = selected;
                        updateMultiEndpoint();
                    });
                });
            }
            
            function updateMultiEndpoint() {
                let endpoint = '/?mc=yes';
                multiCategories.forEach((mc, idx) => {
                    const catId = mc.category;
                    const points = mc.points.length > 0 ? '&' + mc.points.join('&') : '';
                    endpoint += `&&c${idx + 1}=${catId}${points}`;
                });
                updateEndpoint(endpoint);
            }
            
            window.removeMultiCategory = (idx) => {
                multiCategories.splice(idx, 1);
                multiCategories.forEach((mc, i) => mc.id = i + 1);
                renderMultiCategories();
                if (multiCategories.length > 0) updateMultiEndpoint();
            };
            
            document.getElementById('addCategoryBtn').addEventListener('click', addMultiCategory);
            addMultiCategory();
            addMultiCategory();
            break;

        case 'search':
            controls.innerHTML = `
                <div class="control-group">
                    <label>Search Keyword</label>
                    <input type="text" id="searchInput" placeholder="Enter search term">
                </div>
            `;
            document.getElementById('searchInput').addEventListener('input', (e) => {
                updateEndpoint(`/?search=${encodeURIComponent(e.target.value || 'AI')}`);
            });
            updateEndpoint('/?search=AI');
            break;

        case 'search-cat':
            controls.innerHTML = `
                <div class="control-group">
                    <label>Search Keyword</label>
                    <input type="text" id="searchCatInput" placeholder="Enter search term">
                </div>
                <div class="control-group">
                    <label>Select Category</label>
                    <select id="searchCatSelect">
                        ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                    </select>
                </div>
            `;
            
            function updateSearchCatEndpoint() {
                const keyword = document.getElementById('searchCatInput').value || 'AI';
                const catId = document.getElementById('searchCatSelect').value;
                updateEndpoint(`/?search=${encodeURIComponent(keyword)}&&c=${catId}`);
            }
            
            document.getElementById('searchCatInput').addEventListener('input', updateSearchCatEndpoint);
            document.getElementById('searchCatSelect').addEventListener('change', updateSearchCatEndpoint);
            updateSearchCatEndpoint();
            break;

        case 'search-multi':
            controls.innerHTML = `
                <div class="control-group">
                    <label>Search Keyword</label>
                    <input type="text" id="searchMultiInput" placeholder="Enter search term">
                </div>
                <div class="control-group">
                    <label>Select Categories</label>
                    <div class="checkbox-group" id="searchMultiCats">
                        ${categories.map(cat => `
                            <div class="checkbox-item">
                                <input type="checkbox" id="scat-${cat.id}" value="${cat.id}">
                                <label for="scat-${cat.id}">${cat.name}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            function updateSearchMultiEndpoint() {
                const keyword = document.getElementById('searchMultiInput').value || 'AI';
                const selected = Array.from(document.querySelectorAll('#searchMultiCats input:checked'))
                    .map(cb => cb.value);
                
                if (selected.length === 0) {
                    updateEndpoint(`/?search=${encodeURIComponent(keyword)}`);
                    return;
                }
                
                let endpoint = `/?search=${encodeURIComponent(keyword)}&&mc=yes`;
                selected.forEach((catId, idx) => {
                    endpoint += `&&c${idx + 1}=${catId}`;
                });
                updateEndpoint(endpoint);
            }
            
            document.getElementById('searchMultiInput').addEventListener('input', updateSearchMultiEndpoint);
            document.querySelectorAll('#searchMultiCats input').forEach(cb => {
                cb.addEventListener('change', updateSearchMultiEndpoint);
            });
            updateSearchMultiEndpoint();
            break;

        case 'multi-keyword':
            controls.innerHTML = `
                <div class="control-group">
                    <label>Search Keywords (separated by |)</label>
                    <input type="text" id="multiKeywordInput" placeholder="e.g., AI|robot|future">
                </div>
                <div class="control-group">
                    <label>Search in Categories (optional)</label>
                    <div class="checkbox-group" id="multiKeywordCats">
                        ${categories.map(cat => `
                            <div class="checkbox-item">
                                <input type="checkbox" id="mkcat-${cat.id}" value="${cat.id}">
                                <label for="mkcat-${cat.id}">${cat.name}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            function updateMultiKeywordEndpoint() {
                const keywords = document.getElementById('multiKeywordInput').value || 'AI|robot';
                const selected = Array.from(document.querySelectorAll('#multiKeywordCats input:checked'))
                    .map(cb => cb.value);
                
                if (selected.length === 0) {
                    updateEndpoint(`/?search=${encodeURIComponent(keywords)}`);
                    return;
                }
                
                let endpoint = `/?search=${encodeURIComponent(keywords)}&&mc=yes`;
                selected.forEach((catId, idx) => {
                    endpoint += `&&c${idx + 1}=${catId}`;
                });
                updateEndpoint(endpoint);
            }
            
            document.getElementById('multiKeywordInput').addEventListener('input', updateMultiKeywordEndpoint);
            document.querySelectorAll('#multiKeywordCats input').forEach(cb => {
                cb.addEventListener('change', updateMultiKeywordEndpoint);
            });
            updateMultiKeywordEndpoint();
            break;
    }
}

function updateMultiCategoryEndpoint() {
    const selected = Array.from(document.querySelectorAll('#multiCatCheckboxes input:checked'))
        .map(cb => cb.value);
    
    if (selected.length > 0) {
        updateEndpoint(`/?c=${selected.join('&')}`);
    }
}

// script.js - Part 4 of 4

function updateEndpoint(endpoint) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
    document.getElementById('endpointUrl').value = `${baseUrl}/api/${endpoint}`;
}

document.getElementById('copyBtn')?.addEventListener('click', () => {
    const input = document.getElementById('endpointUrl');
    input.select();
    document.execCommand('copy');
    
    const btn = document.getElementById('copyBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
});

document.getElementById('testBtn')?.addEventListener('click', async () => {
    const endpoint = document.getElementById('endpointUrl').value;
    const resultDiv = document.getElementById('testResult');
    
    resultDiv.textContent = 'Loading...';
    
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        resultDiv.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        resultDiv.textContent = `Error: ${error.message}`;
    }
});

function populateCategoryList() {
    const list = document.getElementById('categoryList');
    list.innerHTML = categories.map(cat => 
        `<li><code>${cat.id}</code> - ${cat.name}</li>`
    ).join('');
}

function initAppTab() {
    const pillsContainer = document.getElementById('appCategoryPills');
    pillsContainer.innerHTML = categories.map(cat => 
        `<div class="category-pill" data-cat-id="${cat.id}">${cat.name}</div>`
    ).join('');

    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            pill.classList.toggle('active');
        });
    });

    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.getElementById('generateBtn').addEventListener('click', generateTopics);
}

function generateTopics() {
    const selectedCategories = Array.from(document.querySelectorAll('.category-pill.active'))
        .map(pill => parseInt(pill.dataset.catId));
    
    const categoriesToUse = selectedCategories.length > 0 ? selectedCategories : categories.map(c => c.id);
    
    const type = document.querySelector('.type-btn.active').dataset.type;
    const count = parseInt(document.querySelector('.num-btn.active').dataset.num);

    let availablePoints = [];
    
    categoriesToUse.forEach(catId => {
        const points = allPoints[catId] || [];
        points.forEach(point => {
            const cat = categories.find(c => c.id === catId);
            availablePoints.push({
                ...point,
                category: cat.name,
                categoryId: catId
            });
        });
    });

    if (type === 'fact') {
        availablePoints = availablePoints.filter(p => 
            !p['the-point'].includes('?') && 
            !p.name.toLowerCase().includes('debate') &&
            !p.name.toLowerCase().includes('controversy')
        );
    } else if (type === 'question') {
        availablePoints = availablePoints.filter(p => p['the-point'].includes('?'));
    } else if (type === 'debate') {
        availablePoints = availablePoints.filter(p => 
            p.name.toLowerCase().includes('debate') ||
            p.name.toLowerCase().includes('controversy') ||
            (p['the-point'].includes('?') && (
                p['the-point'].toLowerCase().includes('should') ||
                p['the-point'].toLowerCase().includes('better') ||
                p['the-point'].toLowerCase().includes('would you')
            ))
        );
    }

    const selectedPoints = [];
    const usedIndices = new Set();
    
    while (selectedPoints.length < count && selectedPoints.length < availablePoints.length) {
        const randomIndex = Math.floor(Math.random() * availablePoints.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            selectedPoints.push(availablePoints[randomIndex]);
        }
    }

    displayGeneratedTopics(selectedPoints);
}

function displayGeneratedTopics(points) {
    const resultsContainer = document.getElementById('appResults');
    
    if (points.length === 0) {
        resultsContainer.innerHTML = `
            <div class="results-placeholder">
                <div class="placeholder-icon">🤷</div>
                <p>No topics found matching your criteria. Try adjusting your filters!</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = points.map(point => `
        <div class="result-topic">
            <h4>${point.name}</h4>
            <p>${point['the-point']}</p>
            <p class="result-category">${point.context} • ${point.category}</p>
        </div>
    `).join('');
}

loadCategories();
