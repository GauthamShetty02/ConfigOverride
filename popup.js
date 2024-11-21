let currentTab = 'featureFlags';
let currentEditingPreference = null;

document.addEventListener('DOMContentLoaded', function() {
    const featureFlagsTab = document.getElementById('featureFlagsTab');
    const preferencesTab = document.getElementById('preferencesTab');
    const featureFlagsContent = document.getElementById('featureFlagsContent');
    const preferencesContent = document.getElementById('preferencesContent');
    const refreshButton = document.getElementById('refreshButton');
    const addFeatureFlagButton = document.getElementById('addFeatureFlag');
    const addPreferenceButton = document.getElementById('addPreference');
    const featureFlagSearch = document.getElementById('featureFlagSearch');
    const preferenceSearch = document.getElementById('preferenceSearch');
    const savePreferenceButton = document.getElementById('savePreference');
    const cancelEditButton = document.getElementById('cancelEdit');

    featureFlagsTab.addEventListener('click', () => switchTab('featureFlags'));
    preferencesTab.addEventListener('click', () => switchTab('preferences'));
    refreshButton.addEventListener('click', refreshData);
    addFeatureFlagButton.addEventListener('click', addFeatureFlag);
    addPreferenceButton.addEventListener('click', addPreference);
    featureFlagSearch.addEventListener('input', () => searchItems('featureFlags'));
    preferenceSearch.addEventListener('input', () => searchItems('preferences'));
    savePreferenceButton.addEventListener('click', savePreference);
    cancelEditButton.addEventListener('click', closeEditModal);

    refreshData();
});

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'featureFlags') {
        document.getElementById('featureFlagsTab').classList.add('active');
        document.getElementById('featureFlagsContent').classList.add('active');
    } else {
        document.getElementById('preferencesTab').classList.add('active');
        document.getElementById('preferencesContent').classList.add('active');
    }
}

function refreshData() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        //     chrome.tabs.reload(tabs[0].id);
        // });
        chrome.tabs.sendMessage(tabs[0].id, {action: "getData"}, function(response) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }
            if (response && response.featureFlags) {
                displayFeatureFlags(response.featureFlags);
            }
            if (response && response.preferences) {
                displayPreferences(response.preferences);
            }
        });
    });
}

function displayFeatureFlags(featureFlags) {
    const featureFlagsList = document.getElementById('featureFlagsList');
    featureFlagsList.innerHTML = '';
    for (const [key, value] of Object.entries(featureFlags)) {
        const flagElement = createFeatureFlagElement(key, value);
        featureFlagsList.appendChild(flagElement);
    }
}

function displayPreferences(preferences) {
    const preferencesList = document.getElementById('preferencesList');
    preferencesList.innerHTML = '';
    for (const [key, value] of Object.entries(preferences)) {
        const prefElement = createPreferenceElement(key, value);
        preferencesList.appendChild(prefElement);
    }
}

function createFeatureFlagElement(key, value) {
    const flagElement = document.createElement('div');
    flagElement.className = 'feature-flag';
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = key;
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = value === true;
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    toggleSwitch.appendChild(checkbox);
    toggleSwitch.appendChild(slider);
    
    checkbox.addEventListener('change', function() {
        updateFeatureFlag(key, this.checked);
    });
    
    flagElement.appendChild(nameSpan);
    flagElement.appendChild(toggleSwitch);
    
    return flagElement;
}

function createPreferenceElement(key, value) {
    const prefElement = document.createElement('div');
    prefElement.className = 'preference';
    
    const prefHeader = document.createElement('div');
    prefHeader.className = 'preference-header';
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = key;
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.textContent = 'Edit';
    
    prefHeader.appendChild(nameSpan);
    prefHeader.appendChild(editButton);
    
    const prefContent = document.createElement('div');
    prefContent.className = 'preference-content';
    
    const valueSpan = document.createElement('pre');
    valueSpan.textContent = JSON.stringify(value, null, 2);
    
    prefContent.appendChild(valueSpan);
    
    prefHeader.addEventListener('click', function() {
        prefContent.classList.toggle('active');
    });
    
    editButton.addEventListener('click', function(event) {
        event.stopPropagation();
        openEditModal(key, value);
    });
    
    prefElement.appendChild(prefHeader);
    prefElement.appendChild(prefContent);
    
    return prefElement;
}

function updateFeatureFlag(key, value) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateFeatureFlag",
            flagName: key,
            value: value
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }
            if (response && response.success) {
                console.log(`Feature flag ${key} updated successfully`);
                refreshData();
            } else {
                console.error(`Failed to update feature flag ${key}`);
            }
        });
    });
}

function updatePreference(key, value) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "updatePreference",
            prefName: key,
            value: value
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }
            if (response && response.success) {
                console.log(`Preference ${key} updated successfully`);
                refreshData();
            } else {
                console.error(`Failed to update preference ${key}`);
            }
        });
    });
}

function addFeatureFlag() {
    const nameInput = document.getElementById('newFeatureFlagName');
    const valueInput = document.getElementById('newFeatureFlagValue');
    const name = nameInput.value.trim();
    const value = valueInput.value.trim();

    if (name && value) {
        updateFeatureFlag(name, tryParseValue(value));
        nameInput.value = '';
        valueInput.value = '';
    }
}

function addPreference() {
    const nameInput = document.getElementById('newPreferenceName');
    const valueInput = document.getElementById('newPreferenceValue');
    const name = nameInput.value.trim();
    const value = valueInput.value.trim();

    if (name && value) {
        updatePreference(name, tryParseValue(value));
        nameInput.value = '';
        valueInput.value = '';
    }
}

function tryParseValue(value) {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    if (!isNaN(Number(value))) return Number(value);
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function searchItems(type) {
    const searchInput = document.getElementById(type === 'featureFlags' ? 'featureFlagSearch' : 'preferenceSearch');
    const items = document.querySelectorAll(type === 'featureFlags' ? '.feature-flag' : '.preference');
    const searchTerm = searchInput.value.toLowerCase();
   
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function openEditModal(key, value) {
    currentEditingPreference = { key, value };
    const modal = document.getElementById('editModal');
    const editTabs = document.getElementById('editTabs');
    const editForm = document.getElementById('editForm');
    
    editTabs.innerHTML = '';
    editForm.innerHTML = '';

    const tabs = ['Raw', 'Structured', 'JSON'];
    tabs.forEach((tab, index) => {
        const tabButton = document.createElement('button');
        tabButton.textContent = tab;
        tabButton.className = 'edit-tab';
        if (index === 0) tabButton.classList.add('active');
        tabButton.addEventListener('click', () => switchEditTab(tab));
        editTabs.appendChild(tabButton);

        const section = document.createElement('div');
        section.className = 'edit-form-section';
        if (index === 0) section.classList.add('active');
        section.id = `edit-${tab.toLowerCase()}`;
        editForm.appendChild(section);
    });

    createRawEditForm(key, value);
    createStructuredEditForm(key, value);
    createJSONEditForm(key, value);

    modal.style.display = 'block';
}

function switchEditTab(tab) {
    document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.edit-form-section').forEach(s => s.classList.remove('active'));
    document.querySelector(`.edit-tab:nth-child(${['Raw', 'Structured', 'JSON'].indexOf(tab) + 1})`).classList.add('active');
    document.getElementById(`edit-${tab.toLowerCase()}`).classList.add('active');
}

function createRawEditForm(key, value) {
    const rawSection = document.getElementById('edit-raw');
    const input = document.createElement('textarea');
    input.value = JSON.stringify(value, null, 2);
    input.id = 'raw-edit-input';
    rawSection.appendChild(input);
}

function createStructuredEditForm(key, value) {
    const structuredSection = document.getElementById('edit-structured');
    
    const createInput = (key, value, path = '') => {
        const fullPath = path ? `${path}.${key}` : key;
        const label = document.createElement('label');
        label.textContent = fullPath;
        structuredSection.appendChild(label);

        if (typeof value === 'object' && value !== null) {
            for (const [k, v] of Object.entries(value)) {
                createInput(k, v, fullPath);
            }
        } else {
            const input = document.createElement(typeof value === 'string' && value.length > 50 ? 'textarea' : 'input');
            input.value = value;
            input.dataset.path = fullPath;
            structuredSection.appendChild(input);
        }
    };

    createInput(key, value);
}

function createJSONEditForm(key, value) {
    const jsonSection = document.getElementById('edit-json');
    const input = document.createElement('textarea');
    input.value = JSON.stringify(value, null, 2);
    input.id = 'json-edit-input';
    jsonSection.appendChild(input);
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    currentEditingPreference = null;
}

function savePreference() {
    if (!currentEditingPreference) return;

    let updatedValue;
    const activeTab = document.querySelector('.edit-tab.active').textContent;

    switch (activeTab) {
        case 'Raw':
            updatedValue = tryParseValue(document.getElementById('raw-edit-input').value);
            break;
        case 'Structured':
            updatedValue = {};
            const inputs = document.querySelectorAll('#edit-structured input, #edit-structured textarea');
            inputs.forEach(input => {
                const path = input.dataset.path.split('.');
                let current = updatedValue;
                for (let i = 0; i < path.length - 1; i++) {
                    if (!current[path[i]]) {
                        current[path[i]] = {};
                    }
                    current = current[path[i]];
                }
                current[path[path.length - 1]] = tryParseValue(input.value);
            });
            break;
        case 'JSON':
            try {
                updatedValue = JSON.parse(document.getElementById('json-edit-input').value);
            } catch (error) {
                alert('Invalid JSON. Please check your input and try again.');
                return;
            }
            break;
    }

    updatePreference(currentEditingPreference.key, updatedValue);
    closeEditModal();
}

// Ensure that the popup script updates its data when it's opened
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "popup") {
        port.onDisconnect.addListener(function() {
            refreshData();
        });
    }
});