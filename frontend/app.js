const API_BASE = "http://127.0.0.1:8000/api";

// DOM Elements
const adhocForm = document.getElementById('adhoc-form');
const gridBody = document.getElementById('grid-body');
const addRowBtn = document.getElementById('add-row-btn');
const resultsPanel = document.getElementById('results-panel');
const bookSelectedBtn = document.getElementById('book-selected-btn');
const resultContext = document.getElementById('result-context');
const bookingStatus = document.getElementById('booking-status');

const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');

const inboxList = document.getElementById('inbox-list');
const refreshEmailsBtn = document.getElementById('refresh-emails');

// Current Pricing State (for booking)
let pricedOptions = []; // Array of { id, payload, price }

// Helpers
const formatCurrency = (num) => parseFloat(num).toFixed(2);
const generateId = () => Math.random().toString(36).substr(2, 9);

// Counterparty list (can be loaded from backend later)
const COUNTERPARTIES = [
    'Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Citi', 'Barclays',
    'BofA Securities', 'UBS', 'Credit Suisse', 'Deutsche Bank', 'HSBC',
    'BNP Paribas', 'Societe Generale', 'Nomura', 'Internal'
];

// Flatpickr config for all date inputs
const flatpickrConfig = {
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'Y-m-d',
    allowInput: true,
    disableMobile: true
};

// --- 1. Grid Interaction ---

// Fetch defaults from backend for a given ticker
async function fetchTickerDefaults(ticker) {
    if (!ticker || ticker.trim() === '') return null;
    try {
        const response = await fetch(`${API_BASE}/defaults/${encodeURIComponent(ticker.trim())}`);
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

function createGridRow(data = {}) {
    const rowId = generateId();
    const tr = document.createElement('tr');
    tr.id = `row-${rowId}`;
    tr.dataset.rowId = rowId;

    // Read global overrides
    const defTicker = document.getElementById('global-ticker').value;
    const defType = document.getElementById('global-type').value;
    const defStrike = document.getElementById('global-strike').value;
    const defMaturity = document.getElementById('global-maturity').value;
    const defSpot = document.getElementById('global-spot').value;
    const defRate = document.getElementById('global-rate').value;
    const defVol = document.getElementById('global-vol').value;
    const defDiv = document.getElementById('global-div').value;
    const defBorrow = document.getElementById('global-borrow').value;

    const tTicker = data.ticker || defTicker || '';
    const tType = data.option_type || defType || 'call';
    const tStrike = data.strike || defStrike || '';
    const tMaturity = data.maturity_date || ((data.time_to_maturity === undefined && !data.ticker) ? defMaturity : '');
    const tSpot = data.spot_override || defSpot || '';
    const tRate = data.rate_override || defRate || '';
    const tVol = data.vol_override || defVol || '';
    const tDiv = data.div_override || defDiv || '';
    const tBorrow = data.borrow_override || defBorrow || '';
    const tStrikeType = data.strike_type || 'AbsStrike';

    // New Fields
    const defQuantity = document.getElementById('global-quantity').value;
    const defQuantityType = document.getElementById('global-quantity-type').value;
    const defExecSpot = document.getElementById('global-exec-spot').value;

    const tQuantity = data.quantity || defQuantity || '1';
    const tQuantityType = data.quantity_type || defQuantityType || 'Notional';
    const tExecSpot = data.exec_spot || defExecSpot || '';

    const tCounterparty = data.counterparty || '';
    const tExecMethod = data.exec_method || 'DeltaAdj';

    // Build counterparty options
    const cpOptions = COUNTERPARTIES.map(cp => `<option value="${cp}" ${cp === tCounterparty ? 'selected' : ''}>${cp}</option>`).join('');

    tr.innerHTML = `
        <td style="text-align:center;"><input type="checkbox" class="row-select" id="check-${rowId}" disabled></td>
        <td><input type="text" class="cell-ticker" placeholder="AAPL" value="${tTicker}" required></td>
        <td>
            <select class="cell-type" required>
                <option value="call" ${tType === 'call' ? 'selected' : ''}>Call</option>
                <option value="put" ${tType === 'put' ? 'selected' : ''}>Put</option>
            </select>
        </td>
        <td><input type="number" step="1" class="cell-quantity" placeholder="1" value="${tQuantity}" required></td>
        <td>
            <select class="cell-quantity-type">
                <option value="Notional" ${tQuantityType === 'Notional' ? 'selected' : ''}>Not</option>
                <option value="Unit" ${tQuantityType === 'Unit' ? 'selected' : ''}>Unit</option>
            </select>
        </td>
        <td>
            <select class="cell-strike-type">
                <option value="AbsStrike" ${tStrikeType === 'AbsStrike' ? 'selected' : ''}>Abs</option>
                <option value="RelativeStrike" ${tStrikeType === 'RelativeStrike' ? 'selected' : ''}>Rel%</option>
            </select>
        </td>
        <td><div class="strike-wrapper${tStrikeType === 'RelativeStrike' ? ' rel-mode' : ''}"><input type="number" step="${tStrikeType === 'RelativeStrike' ? '1' : '0.01'}" class="cell-strike" placeholder="${tStrikeType === 'RelativeStrike' ? '100' : '150'}" value="${tStrike}" required></div></td>
        <td><input type="text" class="cell-ttm" placeholder="YYYY-MM-DD" value="${tMaturity}" required></td>
        <td class="cell-return-type" style="font-size:0.78rem; color:var(--text-muted); white-space:nowrap;">—</td>
        <td><input type="number" step="0.01" class="cell-spot" placeholder="—" value="${tSpot}"></td>
        <td><input type="number" step="0.001" class="cell-rate" placeholder="—" value="${tRate}"></td>
        <td><input type="number" step="0.01" class="cell-vol" placeholder="—" value="${tVol}"></td>
        <td><input type="number" step="0.0001" class="cell-div" placeholder="—" value="${tDiv}"></td>
        <td><input type="number" step="0.0001" class="cell-borrow" placeholder="—" value="${tBorrow}"></td>
        <td>
            <select class="cell-counterparty">
                <option value="">—</option>
                ${cpOptions}
            </select>
        </td>
        <td>
            <select class="cell-exec-method">
                <option value="DeltaAdj" ${tExecMethod === 'DeltaAdj' ? 'selected' : ''}>DeltaAdj</option>
                <option value="Re-Ref" ${tExecMethod === 'Re-Ref' ? 'selected' : ''}>Re-Ref</option>
            </select>
        </td>
        <td class="price-cell" id="price-${rowId}">-</td>
        <td class="delta-cell" id="delta-${rowId}">-</td>
        <td style="display: flex; gap: 4px; align-items: center;">
            <input type="number" step="0.01" class="cell-exec-spot" placeholder="—" value="${tExecSpot}" style="width: 70px;">
            <button type="button" class="btn outline-btn btn-sm get-spot-btn" style="padding: 2px 6px; font-size: 0.7rem;">Get</button>
        </td>
        <td class="final-strike-cell" id="final-strike-${rowId}" style="text-align:right;">-</td>
        <td class="final-price-cell" id="final-price-${rowId}" style="text-align:right;">-</td>
        <td class="final-qty-cell" id="final-qty-${rowId}" style="text-align:right;">-</td>
        <td><button type="button" class="remove-row-btn" data-id="${rowId}">X</button></td>
    `;

    // Remove handler
    tr.querySelector('.remove-row-btn').addEventListener('click', (e) => {
        const idToRemove = e.target.getAttribute('data-id');
        document.getElementById(`row-${idToRemove}`).remove();
        pricedOptions = pricedOptions.filter(o => o.id !== idToRemove);
        updateBookButtonState();
    });

    // Checkbox handler
    tr.querySelector('.row-select').addEventListener('change', () => {
        updateBookButtonState();
    });

    // Column Grouping Synchronization
    const strikeTypeSelect = tr.querySelector('.cell-strike-type');
    const strikeInput = tr.querySelector('.cell-strike');
    const strikeWrapper = tr.querySelector('.strike-wrapper');
    const qtyTypeSelect = tr.querySelector('.cell-quantity-type');
    const execMethodSelect = tr.querySelector('.cell-exec-method');

    function syncDropdowns(source) {
        if (source.value === 'Unit' || source.value === 'AbsStrike' || source.value === 'DeltaAdj') {
            qtyTypeSelect.value = 'Unit';
            strikeTypeSelect.value = 'AbsStrike';
            execMethodSelect.value = 'DeltaAdj';
            // Trigger strike type logic (placeholders)
            strikeInput.placeholder = '150';
            strikeInput.step = '0.01';
            strikeWrapper.classList.remove('rel-mode');
        } else if (source.value === 'Notional' || source.value === 'RelativeStrike' || source.value === 'Re-Ref') {
            qtyTypeSelect.value = 'Notional';
            strikeTypeSelect.value = 'RelativeStrike';
            execMethodSelect.value = 'Re-Ref';
            // Trigger strike type logic (placeholders)
            strikeInput.placeholder = '100';
            strikeInput.step = '1';
            strikeWrapper.classList.add('rel-mode');
        }
    }

    qtyTypeSelect.addEventListener('change', (e) => syncDropdowns(e.target));
    execMethodSelect.addEventListener('change', (e) => syncDropdowns(e.target));
    strikeTypeSelect.addEventListener('change', (e) => {
        syncDropdowns(e.target);
        // Explicitly trigger finals recalculation when strike type changes
        calculateFinals(rowId);
    });

    // Ticker blur handler — fetch defaults
    const tickerInput = tr.querySelector('.cell-ticker');
    tickerInput.addEventListener('blur', async () => {
        const ticker = tickerInput.value.trim();
        if (!ticker) return;

        const defaults = await fetchTickerDefaults(ticker);
        if (!defaults) return;

        // Update return type display
        const returnCell = tr.querySelector('.cell-return-type');
        returnCell.innerText = defaults.return_type === 'ExcessReturn' ? 'Excess' : 'Total';
        returnCell.style.color = defaults.return_type === 'ExcessReturn' ? 'var(--warning, #f59e0b)' : 'var(--accent, #22d3ee)';

        // Update placeholders with actual defaults
        tr.querySelector('.cell-spot').placeholder = defaults.spot;
        tr.querySelector('.cell-rate').placeholder = defaults.rate;
        tr.querySelector('.cell-vol').placeholder = defaults.vol;
        tr.querySelector('.cell-div').placeholder = defaults.div;
        tr.querySelector('.cell-borrow').placeholder = defaults.borrow;
    });

    // "Get Spot" handler
    const getSpotBtn = tr.querySelector('.get-spot-btn');
    const execSpotInput = tr.querySelector('.cell-exec-spot');
    getSpotBtn.addEventListener('click', async () => {
        const ticker = tickerInput.value.trim();
        if (!ticker) {
            alert("Please enter a ticker first.");
            return;
        }

        // Temporarily disable the button to show progress
        getSpotBtn.innerText = '...';
        getSpotBtn.disabled = true;

        try {
            const defaults = await fetchTickerDefaults(ticker);
            if (defaults && defaults.spot) {
                execSpotInput.value = defaults.spot;
                // Trigger calculation if needed
                calculateFinals(rowId);
            } else {
                alert("Could not find spot for ticker: " + ticker);
            }
        } catch (e) {
            console.error("Error fetching spot", e);
        } finally {
            getSpotBtn.innerText = 'Get';
            getSpotBtn.disabled = false;
        }
    });

    // Recalculate finals on relevant input changes
    const inputsToWatch = ['.cell-quantity', '.cell-quantity-type', '.cell-strike-type', '.cell-strike', '.cell-exec-spot', '.cell-spot'];
    inputsToWatch.forEach(selector => {
        tr.querySelector(selector).addEventListener('input', () => calculateFinals(rowId));
        tr.querySelector(selector).addEventListener('change', () => calculateFinals(rowId));
    });

    gridBody.appendChild(tr);

    // Initialize Flatpickr on the maturity date input
    flatpickr(tr.querySelector('.cell-ttm'), flatpickrConfig);

    // If ticker was pre-filled, auto-fetch defaults
    if (tTicker) {
        tickerInput.dispatchEvent(new Event('blur'));
    }
}

// Function to calculate and update Final Strikes, Prices, and Quantities
function calculateFinals(rowId) {
    const tr = document.getElementById(`row-${rowId}`);
    if (!tr) return;

    const optData = pricedOptions.find(o => o.id === rowId);

    // Read inputs
    const strike = parseFloat(tr.querySelector('.cell-strike').value) || 0;
    const strikeType = tr.querySelector('.cell-strike-type').value;
    const qty = parseFloat(tr.querySelector('.cell-quantity').value) || 0;
    const qtyType = tr.querySelector('.cell-quantity-type').value;

    // ExecSpot takes precedence. If missing, fall back to override, then placeholder (refSpot)
    const rawExecSpot = tr.querySelector('.cell-exec-spot').value;
    const refSpotVal = tr.querySelector('.cell-spot').value || tr.querySelector('.cell-spot').placeholder;
    const effectiveSpot = rawExecSpot ? parseFloat(rawExecSpot) : parseFloat(refSpotVal);

    const fStrikeCell = document.getElementById(`final-strike-${rowId}`);
    const fPriceCell = document.getElementById(`final-price-${rowId}`);
    const fQtyCell = document.getElementById(`final-qty-${rowId}`);

    // If we can't determine a spot and we need one for relative calcs, bail
    const needSpot = (strikeType === 'RelativeStrike' || qtyType === 'Notional');
    if (needSpot && (isNaN(effectiveSpot) || effectiveSpot <= 0)) {
        fStrikeCell.innerText = '-';
        fPriceCell.innerText = '-';
        fQtyCell.innerText = '-';
        return;
    }

    // 1. Final Strike
    if (strikeType === 'RelativeStrike') {
        const finalStrike = (strike / 100) * effectiveSpot;
        fStrikeCell.innerText = finalStrike.toFixed(4);
    } else {
        fStrikeCell.innerText = strike.toFixed(4);
    }

    // 2. Final Quantity
    if (qtyType === 'Notional') {
        const finalQty = qty / effectiveSpot;
        fQtyCell.innerText = finalQty.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else {
        fQtyCell.innerText = qty.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    // 3. Final Price (Requires that we have already priced the option via API)
    if (optData && optData.price !== undefined) {
        if (strikeType === 'RelativeStrike') {
            // Price from API is absolute dollar amount. 
            // In earlier implementation, UI showed % but the optData.price is raw.
            // When strike is relative, the underlying API returned the dollar price calculated off the ref_spot.
            // If exec_spot changed, strictly speaking we might need a reprice, but if we just scale the original % price to the new exec_spot:
            // the initial % price was (optData.price / optData.payload.ref_spot).
            const originalRefSpot = optData.payload.ref_spot || effectiveSpot;
            const pctPrice = optData.price / originalRefSpot;
            const finalPrice = pctPrice * effectiveSpot;
            fPriceCell.innerText = `$${finalPrice.toFixed(4)}`;
        } else {
            // DeltaAdj: Final Price = API_price + (ExecSpot - OriginalSpot) * delta
            const originalSpot = optData.payload.ref_spot || optData.payload.spot_override || effectiveSpot;
            const delta = optData.delta / 100; // API returns delta as percentage, convert back
            const finalPrice = optData.price + (effectiveSpot - originalSpot) * delta;
            fPriceCell.innerText = `$${finalPrice.toFixed(4)}`;
        }
    } else {
        fPriceCell.innerText = '-';
    }
}

// Global Override: Apply Overrides function
function applyGlobalOverrides() {
    const overrides = [
        { globalId: 'global-ticker', targetClass: '.cell-ticker', name: 'Ticker' },
        { globalId: 'global-type', targetClass: '.cell-type', name: 'Type' },
        { globalId: 'global-quantity', targetClass: '.cell-quantity', name: 'Quantity' },
        { globalId: 'global-quantity-type', targetClass: '.cell-quantity-type', name: 'QtyType' },
        { globalId: 'global-strike', targetClass: '.cell-strike', name: 'Strike' },
        { globalId: 'global-maturity', targetClass: '.cell-ttm', name: 'Maturity Date' },
        { globalId: 'global-spot', targetClass: '.cell-spot', name: 'RefSpot' },
        { globalId: 'global-rate', targetClass: '.cell-rate', name: 'Rate' },
        { globalId: 'global-vol', targetClass: '.cell-vol', name: 'Vol' },
        { globalId: 'global-div', targetClass: '.cell-div', name: 'Div' },
        { globalId: 'global-borrow', targetClass: '.cell-borrow', name: 'Borrow' },
        { globalId: 'global-exec-spot', targetClass: '.cell-exec-spot', name: 'ExecSpot' },
    ];



    const rows = Array.from(gridBody.querySelectorAll('tr'));
    if (rows.length === 0) { alert('No rows to apply overrides to.'); return; }

    let anySet = false;
    let fields = [];

    overrides.forEach(({ globalId, targetClass, name }) => {
        const globalVal = document.getElementById(globalId).value;
        if (!globalVal) return;
        anySet = true;
        fields.push(name);
        rows.forEach(tr => {
            const target = tr.querySelector(targetClass);
            if (!target) return;
            // For maturity, use Flatpickr API so the visible alt-input updates
            if (targetClass === '.cell-ttm' && target._flatpickr) {
                target._flatpickr.setDate(globalVal, true);
            } else {
                target.value = globalVal;
                // Dispatch input event to trigger final calculations if applicable
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    });

    // If ticker was overridden, re-fetch defaults for all rows
    if (fields.includes('Ticker')) {
        rows.forEach(tr => {
            const tickerInput = tr.querySelector('.cell-ticker');
            if (tickerInput) tickerInput.dispatchEvent(new Event('blur'));
        });
    }

    if (!anySet) {
        alert('Please set at least one global override value first.');
        return;
    }

    alert(`Applied global overrides (${fields.join(', ')}) to ${rows.length} row(s).`);
}

// Hook up the Apply Overrides button
const applyOverridesBtn = document.getElementById('apply-overrides-btn');
if (applyOverridesBtn) {
    applyOverridesBtn.addEventListener('click', applyGlobalOverrides);
}

// Calculate TTM helper
function calculateTTM(targetDateStr) {
    if (!targetDateStr) return 0;
    const targetDate = new Date(targetDateStr);
    const today = new Date();
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? (diffDays / 365.25) : 0;
}

// Add an initial empty row
createGridRow();

// Add btn handler
addRowBtn.addEventListener('click', () => {
    createGridRow();
});

// Submit all rows
adhocForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rows = Array.from(gridBody.querySelectorAll('tr'));
    if (rows.length === 0) return;

    // Read Global Overrides as fallbacks
    const globalTicker = document.getElementById('global-ticker').value;
    const globalType = document.getElementById('global-type').value;
    const globalStrike = document.getElementById('global-strike').value;
    const globalMaturityDate = document.getElementById('global-maturity').value;
    const globalSpot = document.getElementById('global-spot').value;
    const globalRate = document.getElementById('global-rate').value;
    const globalVol = document.getElementById('global-vol').value;
    const globalDiv = document.getElementById('global-div').value;
    const globalBorrow = document.getElementById('global-borrow').value;

    // Build payloads
    const requests = rows.map(tr => {
        const rowId = tr.dataset.rowId;

        const rowMaturityDate = tr.querySelector('.cell-ttm').value || globalMaturityDate;
        const calculatedTtm = calculateTTM(rowMaturityDate);

        const strikeType = tr.querySelector('.cell-strike-type').value || 'AbsStrike';
        let strikeVal = parseFloat(tr.querySelector('.cell-strike').value || globalStrike);
        // RelativeStrike: user enters 100 meaning 100%, backend expects 1.0
        if (strikeType === 'RelativeStrike') {
            strikeVal = strikeVal / 100;
        }

        const payload = {
            id: rowId,
            ticker: tr.querySelector('.cell-ticker').value || globalTicker,
            option_type: tr.querySelector('.cell-type').value || globalType,
            strike: strikeVal,
            time_to_maturity: calculatedTtm,
            strike_type: strikeType
        };

        // Row overrides > global overrides > backend defaults (placeholder)
        const spot = tr.querySelector('.cell-spot').value || globalSpot;
        const spotPlaceholder = tr.querySelector('.cell-spot').placeholder;
        const rate = tr.querySelector('.cell-rate').value || globalRate;
        const vol = tr.querySelector('.cell-vol').value || globalVol;
        const div = tr.querySelector('.cell-div').value || globalDiv;
        const borrow = tr.querySelector('.cell-borrow').value || globalBorrow;

        if (spot) { payload.spot_override = parseFloat(spot); payload.ref_spot = parseFloat(spot); }
        // For relative strike display, always capture ref_spot even from placeholder
        if (!payload.ref_spot && spotPlaceholder && spotPlaceholder !== '—') {
            payload.ref_spot = parseFloat(spotPlaceholder);
        }
        if (rate) payload.rate_override = parseFloat(rate);
        if (vol) payload.vol_override = parseFloat(vol);
        if (div) payload.div_override = parseFloat(div);
        if (borrow) payload.borrow_override = parseFloat(borrow);

        // Include new fields for completeness (and API if updated later)
        payload.quantity = parseFloat(tr.querySelector('.cell-quantity').value) || 1;
        payload.quantity_type = tr.querySelector('.cell-quantity-type').value;
        const execSpot = tr.querySelector('.cell-exec-spot').value;
        if (execSpot) payload.exec_spot = parseFloat(execSpot);

        return payload;
    });

    // Process all requests
    pricedOptions = [];
    bookingStatus.classList.add('hidden');

    await Promise.all(requests.map(req => processGridRequest(req)));
    updateBookButtonState();
});

async function processGridRequest(req) {
    const priceCell = document.getElementById(`price-${req.id}`);
    const deltaCell = document.getElementById(`delta-${req.id}`);
    priceCell.innerText = '...';
    deltaCell.innerText = '...';
    priceCell.classList.remove('error');

    const apiPayload = { ...req };
    delete apiPayload.id;

    try {
        const response = await fetch(`${API_BASE}/price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) throw new Error("Err");

        const data = await response.json();

        // Display price: percentage of ref_spot for RelativeStrike, dollar for AbsStrike
        if (req.strike_type === 'RelativeStrike' && req.ref_spot) {
            const pctPrice = (data.price / req.ref_spot) * 100;
            priceCell.innerText = `${pctPrice.toFixed(2)}%`;
        } else if (req.strike_type === 'RelativeStrike' && req.spot_override) {
            const pctPrice = (data.price / req.spot_override) * 100;
            priceCell.innerText = `${pctPrice.toFixed(2)}%`;
        } else {
            priceCell.innerText = `$${formatCurrency(data.price)}`;
        }
        deltaCell.innerText = `${data.delta}%`;

        pricedOptions.push({ id: req.id, payload: apiPayload, price: data.price, delta: data.delta });

        const checkbox = document.getElementById(`check-${req.id}`);
        checkbox.disabled = false;
        checkbox.checked = true;

        // Recalculate Finals now that we have the price
        calculateFinals(req.id);

    } catch (err) {
        priceCell.innerText = "Error";
        deltaCell.innerText = "-";
        priceCell.classList.add('error');
    }
}

function updateBookButtonState() {
    const anyChecked = Array.from(document.querySelectorAll('.row-select:checked')).length > 0;
    if (anyChecked) {
        bookSelectedBtn.classList.remove('hidden');
    } else {
        bookSelectedBtn.classList.add('hidden');
    }
}

// --- 2. File Uploading ---
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleUpload(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleUpload(e.target.files[0]);
    }
});

async function handleUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("File upload/parsing failed.");
        const data = await response.json();

        if (data.parsed_requests && data.parsed_requests.length > 0) {
            const rows = Array.from(gridBody.querySelectorAll('tr'));
            if (rows.length === 1) {
                const tr = rows[0];
                const ticker = tr.querySelector('.cell-ticker').value;
                if (!ticker) {
                    tr.querySelector('.remove-row-btn').click();
                }
            }

            data.parsed_requests.forEach(req => {
                createGridRow(req);
            });

            alert(`Parsed ${data.parsed_requests.length} requests successfully and added them to the pricing grid.`);
        } else {
            alert("No valid requests parsed from file.");
        }
    } catch (err) {
        alert(err.message);
    } finally {
        fileInput.value = '';
    }
}

// --- 3. Live Email Inbox ---
async function fetchEmails() {
    inboxList.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const response = await fetch(`${API_BASE}/emails`);
        if (!response.ok) throw new Error("Could not fetch emails.");

        const data = await response.json();
        inboxList.innerHTML = '';

        if (data.emails.length === 0) {
            inboxList.innerHTML = '<p class="muted-text text-center">No new requests</p>';
            return;
        }

        data.emails.forEach(email => {
            const el = document.createElement('div');
            el.className = 'email-card';
            const pd = email.parsed_data;
            el.innerHTML = `
                <div class="email-sender">${email.sender}</div>
                <div class="email-subject">${email.subject}</div>
                <div class="email-badges">
                    <span class="badge">${pd.ticker}</span>
                    <span class="badge type">${pd.option_type.toUpperCase()}</span>
                    <span class="badge">${pd.strike_type === 'RelativeStrike' ? pd.strike + '%' : 'K:' + pd.strike}</span>
                    <span class="badge">${pd.maturity_date || ('T:' + pd.time_to_maturity)}</span>
                    ${pd.counterparty ? `<span class="badge">${pd.counterparty}</span>` : ''}
                    ${pd.exec_method ? `<span class="badge type">${pd.exec_method}</span>` : ''}
                </div>
            `;
            el.addEventListener('click', () => {
                createGridRow(pd);
            });
            inboxList.appendChild(el);
        });

    } catch (err) {
        inboxList.innerHTML = `<p class="error-text text-center">${err.message}</p>`;
    }
}

refreshEmailsBtn.addEventListener('click', fetchEmails);

// Portfolio mapping: ticker -> portfolio name
const PORTFOLIO_MAP = {
    'AAPL': 'US Tech Equity',
    'MSFT': 'US Tech Equity',
    'NVDA': 'US Tech Equity',
    'AMZN': 'US Tech Equity',
    'TSLA': 'US Tech Equity',
    'SPY': 'US Index',
    'SPX': 'US Index',
    'NDX': 'US Index',
    'RTY': 'US Index',
    'INDU': 'US Index',
    'UKX': 'EMEA Index',
    'SX5E': 'EMEA Index',
    'NKY': 'APAC Index',
    'HSI': 'APAC Index',
};
const DEFAULT_PORTFOLIO = 'General Trading';

function getPortfolio(ticker) {
    return PORTFOLIO_MAP[(ticker || '').toUpperCase()] || DEFAULT_PORTFOLIO;
}

// --- 4. Booking Initialization ---
bookSelectedBtn.addEventListener('click', async () => {
    const checkedRows = Array.from(document.querySelectorAll('.row-select:checked')).map(cb => cb.id.replace('check-', ''));
    const optionsToBook = pricedOptions.filter(o => checkedRows.includes(o.id));

    if (optionsToBook.length === 0) return;

    bookSelectedBtn.innerText = "Booking...";
    bookSelectedBtn.disabled = true;
    resultsPanel.style.display = 'block';

    try {
        let successCount = 0;

        for (const opt of optionsToBook) {
            const tr = document.getElementById(`row-${opt.id}`);
            if (!tr) continue;

            // Read final values from the DOM
            const ticker = tr.querySelector('.cell-ticker').value;
            const optionType = tr.querySelector('.cell-type').value;
            const strikeType = tr.querySelector('.cell-strike-type').value;
            const execMethod = tr.querySelector('.cell-exec-method').value;
            const counterparty = tr.querySelector('.cell-counterparty').value;
            const maturity = tr.querySelector('.cell-ttm').value;
            const execSpot = tr.querySelector('.cell-exec-spot').value;
            const refSpot = tr.querySelector('.cell-spot').value || tr.querySelector('.cell-spot').placeholder;

            const finalStrike = document.getElementById(`final-strike-${opt.id}`)?.innerText || '-';
            const finalPrice = document.getElementById(`final-price-${opt.id}`)?.innerText || '-';
            const finalQty = document.getElementById(`final-qty-${opt.id}`)?.innerText || '-';

            const bookingPayload = {
                instrument: 'Option',
                ticker: ticker,
                option_type: optionType,
                strike_type: strikeType,
                exec_method: execMethod,
                maturity: maturity,
                counterparty: counterparty,
                portfolio: getPortfolio(ticker),
                ref_spot: parseFloat(refSpot) || null,
                exec_spot: parseFloat(execSpot) || null,
                indicative_price: opt.price,
                indicative_delta: opt.delta,
                final_strike: finalStrike,
                final_price: finalPrice,
                final_quantity: finalQty,
                action: 'INITIATE_BOOKING'
            };

            const response = await fetch(`${API_BASE}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingPayload)
            });
            if (response.ok) {
                successCount++;
            }
        }

        bookingStatus.className = 'booking-status success';
        bookingStatus.classList.remove('hidden');
        bookingStatus.innerText = `Successfully initiated ${successCount}/${optionsToBook.length} bookings!`;
        resultContext.innerHTML = `Booked options for: ${optionsToBook.map(p => p.payload.ticker).join(', ')}`;

    } catch (err) {
        bookingStatus.className = 'booking-status';
        bookingStatus.classList.remove('hidden');
        bookingStatus.style.color = 'var(--error)';
        bookingStatus.innerText = "Booking failed.";
    } finally {
        bookSelectedBtn.innerText = "Book Selected";
        bookSelectedBtn.disabled = false;
    }
});

// Init
fetchEmails();

// Initialize Flatpickr on global maturity override
flatpickr(document.getElementById('global-maturity'), flatpickrConfig);

// --- 5. Copy Grid to Clipboard (Excel-friendly) ---
function copyGridToClipboard() {
    const headers = ['Ticker', 'Type', 'Quantity', 'QtyType', 'StrikeType', 'Strike', 'Maturity', 'Return Type', 'RefSpot', 'Rate', 'Vol', 'Div', 'Borrow', 'Counterparty', 'ExecMethod', 'Price', 'Delta', 'ExecSpot', 'Final Strike', 'Final Price', 'Final Qty'];
    const rows = Array.from(gridBody.querySelectorAll('tr'));

    if (rows.length === 0) { alert('No data to copy.'); return; }

    const lines = [headers.join('\t')];

    rows.forEach(tr => {
        const ticker = tr.querySelector('.cell-ticker')?.value || '';
        const type = tr.querySelector('.cell-type')?.value || '';
        const quantity = tr.querySelector('.cell-quantity')?.value || '';
        const qtyType = tr.querySelector('.cell-quantity-type')?.value || '';
        const strikeType = tr.querySelector('.cell-strike-type')?.value || '';
        const strike = tr.querySelector('.cell-strike')?.value || '';
        const maturity = tr.querySelector('.cell-ttm')?.value || '';
        const returnType = tr.querySelector('.cell-return-type')?.innerText || '';
        const spot = tr.querySelector('.cell-spot')?.value || '';
        const rate = tr.querySelector('.cell-rate')?.value || '';
        const vol = tr.querySelector('.cell-vol')?.value || '';
        const div = tr.querySelector('.cell-div')?.value || '';
        const borrow = tr.querySelector('.cell-borrow')?.value || '';
        const counterparty = tr.querySelector('.cell-counterparty')?.value || '';
        const execMethod = tr.querySelector('.cell-exec-method')?.value || '';
        const priceCell = tr.querySelector('.price-cell');
        const price = priceCell ? priceCell.innerText.replace('$', '') : '';
        const deltaCell = tr.querySelector('.delta-cell');
        const delta = deltaCell ? deltaCell.innerText : '';
        const execSpot = tr.querySelector('.cell-exec-spot')?.value || '';
        const fStrike = document.getElementById(`final-strike-${tr.dataset.rowId}`)?.innerText || '';
        const fPrice = document.getElementById(`final-price-${tr.dataset.rowId}`)?.innerText || '';
        const fQty = document.getElementById(`final-qty-${tr.dataset.rowId}`)?.innerText || '';

        lines.push([ticker, type, quantity, qtyType, strikeType, strike, maturity, returnType, spot, rate, vol, div, borrow, counterparty, execMethod, price, delta, execSpot, fStrike, fPrice, fQty].join('\t'));
    });

    const tsv = lines.join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
        const btn = document.getElementById('copy-grid-btn');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        }
    }).catch(() => {
        alert('Failed to copy — try using Ctrl+C after selecting.');
    });
}

// Hook up copy button
const copyGridBtn = document.getElementById('copy-grid-btn');
if (copyGridBtn) {
    copyGridBtn.addEventListener('click', copyGridToClipboard);
}
