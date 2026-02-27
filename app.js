/**
 * =============== CONFIGURACIÓN IMPORTANTE ===============
 * Pega aquí la URL que te da Google Apps Script al hacer el despliegue de tu Web App.
 * El código de Google Apps Script TIENE QUE DEVOLVER JSON.
 */
const API_URL = "https://script.google.com/macros/s/AKfycbzIgN-89AeY5D6gM5moIbxctyiHcwIr-trzUfUDnBgrDTksdYK_kab55S_yuNFYNwao/exec";

let allData = []; // Datos de despachos
let allExternoData = []; // Datos de transporte externo
let currentTab = 'despachos';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar iconos de Lucide
    lucide.createIcons();

    // 2. Mostrar la fecha actual
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('es-ES', dateOptions);
    document.getElementById('currentDateDisplay').innerText = `Despachos: ${dateStr}`;

    // 3. Registrar Service Worker para PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registrado', reg.scope))
                .catch(err => console.log('Error al registrar SW', err));
        });
    }

    // 4. Listeners para botones, inputs y TABS
    document.getElementById('refreshBtn').addEventListener('click', loadData);
    document.getElementById('retryBtn').addEventListener('click', loadData);
    document.getElementById('searchInput').addEventListener('input', (e) => filterData(e.target.value));

    document.getElementById('tabDespachos').addEventListener('click', () => switchTab('despachos'));
    document.getElementById('tabExterno').addEventListener('click', () => switchTab('externo'));

    // 5. Autorecarga (5 minutos)
    setInterval(loadData, 300000);

    // 6. Carga inicial
    loadData();
});

function switchTab(tabId) {
    currentTab = tabId;
    const btnDespachos = document.getElementById('tabDespachos');
    const btnExterno = document.getElementById('tabExterno');
    const contentDespachos = document.getElementById('contentArea');
    const contentExterno = document.getElementById('contentExterno');
    const searchInput = document.getElementById('searchInput');

    // Cambiar estilos de las pestañas
    if (tabId === 'despachos') {
        btnDespachos.classList.add('border-primary', 'text-white');
        btnDespachos.classList.remove('border-transparent', 'text-slate-500');
        btnExterno.classList.remove('border-primary', 'text-white');
        btnExterno.classList.add('border-transparent', 'text-slate-500');

        contentDespachos.classList.remove('hidden');
        contentExterno.classList.add('hidden');

        // Re-aplicar filtro actual a la pestaña correspondiente
        filterData(searchInput.value);
    } else {
        btnExterno.classList.add('border-primary', 'text-white');
        btnExterno.classList.remove('border-transparent', 'text-slate-500');
        btnDespachos.classList.remove('border-primary', 'text-white');
        btnDespachos.classList.add('border-transparent', 'text-slate-500');

        contentExterno.classList.remove('hidden');
        contentDespachos.classList.add('hidden');

        // Re-aplicar filtro actual a la pestaña correspondiente
        filterData(searchInput.value);
    }
}

function setLoading(isLoading, isError = false, errorMessage = "") {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const contentArea = document.getElementById('contentArea');
    const contentExterno = document.getElementById('contentExterno');
    const errorText = document.getElementById('errorMessage');

    if (isLoading) {
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        contentArea.classList.add('hidden');
        contentExterno.classList.add('hidden');
    } else if (isError) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        contentArea.classList.add('hidden');
        contentExterno.classList.add('hidden');
        errorText.innerText = errorMessage;
    } else {
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');

        // Solo mostramos el contenido de la pestaña activa
        if (currentTab === 'despachos') {
            contentArea.classList.remove('hidden');
        } else {
            contentExterno.classList.remove('hidden');
        }
    }
}

async function loadData() {
    // Si no hay API configurada, mostramos un error amistoso pero no rompemos.
    if (!API_URL) {
        setLoading(false, true, "Falta configurar la URL de la API (Google Apps Script). Revisa el archivo app.js.");
        return;
    }

    setLoading(true);

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        // Mapear compatibilidad para atrás y nueva estructura
        if (Array.isArray(data)) {
            // El API antiguo devolvía un array directo de despachos
            allData = data;
            allExternoData = [];
        } else if (data && typeof data === 'object') {
            // El nuevo API devuelve un diccionario
            allData = data.despachos || [];
            allExternoData = data.externo || [];
        }

        renderData(allData);
        renderExterno(allExternoData);

        setLoading(false);

    } catch (error) {
        console.error("Error cargando los datos:", error);
        setLoading(false, true, "Error de red: " + error.message + ". Verifica si la consola (F12) tiene más detalles.");
    }
}

function filterData(query) {
    if (!query) {
        renderData(allData);
        return;
    }

    const lowerQ = query.toLowerCase();

    if (currentTab === 'despachos') {
        const filtered = allData.filter(item => {
            return Object.values(item).some(val =>
                String(val).toLowerCase().includes(lowerQ)
            );
        });
        renderData(filtered);
    } else {
        const filtered = allExternoData.filter(item => {
            return Object.values(item).some(val =>
                String(val).toLowerCase().includes(lowerQ)
            );
        });
        renderExterno(filtered);
    }
}

// ============== Lógica de UI y Componentes ==============

function getBadgeStyles(statusRaw) {
    const status = (statusRaw || "").replace(/\s+/g, ' ').trim().toUpperCase();

    switch (status) {
        case 'PLANIFICADO':
            return 'bg-slate-700 text-slate-200 border-slate-600';
        case 'POR SALIR':
            return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50 glow-orange font-bold';
        case 'EN RUTA':
            return 'bg-orange-500 text-slate-900 border-orange-400 glow-orange font-bold';
        case 'ENTREGADO':
            return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 glow-emerald font-bold';
        case 'PENDIENTE':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/50 glow-blue font-bold';
        case 'RECHAZADO':
            return 'bg-red-500/20 text-red-400 border-red-500/50 glow-red font-bold';
        case 'FINALIZADO':
            return 'bg-purple-500/20 text-purple-400 border-purple-500/50 font-bold';
        default:
            return 'bg-surface text-slate-400 border-border';
    }
}

function renderData(dataList) {
    const container = document.getElementById('contentArea');
    container.innerHTML = '';

    if (dataList.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 animate-fade-in text-center">
                <div class="bg-surface p-6 rounded-full inline-block mb-4 shadow-lg border border-border">
                    <i data-lucide="clipboard-x" class="h-12 w-12 text-slate-500"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-300">No se encontraron despachos</h3>
                <p class="text-slate-500 mt-2 text-sm max-w-sm">No hay registros que coincidan con la búsqueda para el día de hoy.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // 1. Agrupar por Chofer
    const groups = {};
    dataList.forEach(item => {
        const driver = item.chofer || 'SIN ASIGNAR';
        if (!groups[driver]) groups[driver] = [];
        groups[driver].push(item);
    });

    const drivers = Object.keys(groups).sort();

    // 2. Renderizar cada grupo
    let delay = 0;
    drivers.forEach(driver => {
        const driverItems = groups[driver];

        // Bloque Principal por Chofer
        const section = document.createElement('div');
        section.className = `bg-surface/50 border border-border shadow-2xl rounded-2xl overflow-hidden glass-panel mb-8 animate-fade-in`;
        section.style.animationDelay = `${delay}s`;
        delay += 0.1;

        // Cabecera del Chofer
        const header = document.createElement('div');
        header.className = 'px-4 py-4 sm:px-6 bg-slate-900/80 border-b border-border flex items-center justify-between backdrop-blur-xl';
        header.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                    <i data-lucide="user" class="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400"></i>
                </div>
                <div>
                    <h3 class="text-lg sm:text-xl font-bold text-white tracking-wide">${driver}</h3>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="bg-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                            ${driverItems.length} Envíos
                        </span>
                    </div>
                </div>
            </div>
        `;
        section.appendChild(header);

        // Contenedor de Vistas (Mobile & Desktop)
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'p-0 sm:p-0'; // En móvil sin padding externo porque las cards ya tienen su propio padding

        // ============================================
        // VISTA MÓVIL (CARDS) > Mostrada en < md (768px)
        // ============================================
        const mobileView = document.createElement('div');
        mobileView.className = 'block md:hidden p-3 space-y-3'; // padding interno para las cards

        mobileView.innerHTML = driverItems.map(row => {
            const time = row.fecha ? row.fecha.split(' ')[1] : '--:--';
            const badgeClass = getBadgeStyles(row.estado);

            let obsHtml = '';
            if (row.estado === 'RECHAZADO' && row.motivoRechazo) {
                obsHtml = `<div class="mt-2 text-xs text-red-400 font-medium bg-red-400/10 p-2 rounded-lg border border-red-400/20 flex items-start gap-1.5"><i data-lucide="alert-circle" class="w-3.5 h-3.5 mt-0.5 flex-shrink-0"></i> <span>Rechazo: ${row.motivoRechazo}</span></div>`;
            } else if (row.estado === 'PENDIENTE' && row.motivoPendiente) {
                obsHtml = `<div class="mt-2 text-xs text-blue-400 font-medium bg-blue-400/10 p-2 rounded-lg border border-blue-400/20 flex items-start gap-1.5"><i data-lucide="clock" class="w-3.5 h-3.5 mt-0.5 flex-shrink-0"></i> <span>Pendiente: ${row.motivoPendiente}</span></div>`;
            } else if (row.observacion) {
                obsHtml = `<div class="mt-2 text-xs text-slate-400 italic font-medium bg-slate-800/50 p-2 rounded-lg border border-slate-700"><span class="text-slate-500">Obs:</span> ${row.observacion}</div>`;
            }

            return `
            <div class="bg-[#151e2e] rounded-xl border border-slate-700/60 p-4 shadow-lg relative overflow-hidden group">
                <!-- Color bar on the left indicating status approx -->
                <div class="absolute left-0 top-0 bottom-0 w-1 ${badgeClass.split(' ')[0]} opacity-50"></div>
                
                <div class="flex justify-between items-start mb-3">
                    <div class="flex flex-col">
                        <span class="text-[10px] text-slate-500 font-mono tracking-wider">ID: ${row.id || '-'}</span>
                        <div class="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            <i data-lucide="map-pin" class="h-3 w-3"></i>
                            <span class="truncate max-w-[180px]">${row.direccion || 'Sin dirección'}</span>
                        </div>
                    </div>
                    <span class="border text-[10px] font-bold px-2.5 py-1 rounded-lg text-center shadow-sm ${badgeClass}">
                        ${row.estado || 'N/A'}
                    </span>
                </div>

                <div class="mb-3">
                    <h4 class="text-base font-bold text-white leading-tight">${row.razonSocial || row.cliente || 'Sin Cliente'}</h4>
                    <div class="flex gap-3 mt-2">
                        <span class="text-xs font-semibold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-500/20">F: ${row.folio || '-'}</span>
                        ${row.coti ? `<span class="text-xs font-semibold text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded border border-teal-500/20">C: ${row.coti}</span>` : ''}
                    </div>
                </div>

                ${obsHtml}

                <div class="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs">
                    <div class="flex items-center gap-1.5 text-slate-400">
                        <i data-lucide="briefcase" class="h-3.5 w-3.5"></i>
                        <span class="truncate max-w-[100px]">${row.vendedor || 'Sin asignación'}</span>
                    </div>
                    ${row.checkEntrega || row.check ? `
                        <div class="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                            <i data-lucide="check-square" class="h-3.5 w-3.5"></i> ${row.checkEntrega || row.check}
                        </div>
                    ` : '<span class="text-[10px] text-slate-500 font-mono tracking-widest">--:--</span>'}
                </div>
            </div>
            `;
        }).join('');

        // ============================================
        // VISTA ESCRITORIO (TABLA) > Mostrada en >= md (768px)
        // ============================================
        const desktopView = document.createElement('div');
        desktopView.className = 'hidden md:block overflow-x-auto mt-2';

        let tableHtml = `
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="text-xs uppercase tracking-wider text-slate-400 bg-slate-900 border-y border-border shadow-inner">
                        <th class="px-5 py-3.5 font-semibold text-center" style="width: 140px;">Estado</th>
                        <th class="px-5 py-3.5 font-semibold" style="width: 80px;">ID</th>
                        <th class="px-5 py-3.5 font-semibold" style="max-width: 280px;">Cliente & Dirección</th>
                        <th class="px-5 py-3.5 font-semibold">Referencias</th>
                        <th class="px-5 py-3.5 font-semibold">Observaciones</th>
                        <th class="px-5 py-3.5 font-semibold" style="width: 120px;">Vendedor</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border text-sm">
        `;

        driverItems.forEach(row => {
            const time = row.fecha ? row.fecha.split(' ')[1] : '--:--';
            const badgeClass = getBadgeStyles(row.estado);

            let obsHtml = '';
            if (row.estado === 'RECHAZADO' && row.motivoRechazo) {
                obsHtml = `<div class="text-xs text-red-400 font-medium">Rechazo: ${row.motivoRechazo}</div>`;
            } else if (row.estado === 'PENDIENTE' && row.motivoPendiente) {
                obsHtml = `<div class="text-xs text-blue-400 font-medium">Pend: ${row.motivoPendiente}</div>`;
            } else if (row.observacion) {
                obsHtml = `<div class="text-[11px] text-slate-400 italic line-clamp-2" title="${row.observacion}">${row.observacion}</div>`;
            } else {
                obsHtml = `<span class="text-slate-600">-</span>`;
            }

            tableHtml += `
            <tr class="hover:bg-slate-800/30 transition-colors group">
                <td class="px-5 py-4 whitespace-nowrap">
                    <div class="flex flex-col items-center gap-2">
                        <span class="px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm inline-block text-center w-full min-w-[110px] tracking-wide ${badgeClass}">
                            ${row.estado || 'N/A'}
                        </span>
                        ${row.checkEntrega || row.check ? `
                            <div class="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm w-full">
                                <i data-lucide="check-circle-2" class="h-3.5 w-3.5"></i>
                                ${row.checkEntrega || row.check}
                            </div>
                        ` : ''}
                    </div>
                </td>
                
                <td class="px-5 py-4 whitespace-nowrap">
                    <div class="font-mono text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded inline-block border border-slate-700/50">
                        ${row.id || '-'}
                    </div>
                </td>
                
                <td class="px-5 py-4">
                    <div class="font-bold text-sm text-white mb-1">${row.razonSocial || row.cliente || 'Sin Cliente'}</div>
                    <div class="flex items-center gap-1.5 text-xs text-slate-400">
                        <i data-lucide="map-pin" class="h-3 w-3 flex-shrink-0"></i>
                        <span class="truncate max-w-[200px] xl:max-w-[300px]" title="${row.direccion}">${row.direccion || '-'}</span>
                    </div>
                </td>
                
                <td class="px-5 py-4 whitespace-nowrap">
                    <div class="flex flex-col gap-1.5">
                        <span class="text-indigo-400 font-bold text-xs bg-indigo-500/10 px-2 py-0.5 rounded inline-block border border-indigo-500/20 w-fit">F: ${row.folio || '-'}</span>
                        ${row.coti ? `<span class="text-teal-400 font-bold text-xs bg-teal-500/10 px-2 py-0.5 rounded inline-block border border-teal-500/20 w-fit">C: ${row.coti}</span>` : ''}
                    </div>
                </td>
                
                <td class="px-5 py-4 min-w-[150px] max-w-[250px]">
                    ${obsHtml}
                </td>
                
                <td class="px-5 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                            <i data-lucide="briefcase" class="w-3 h-3 text-slate-400"></i>
                        </div>
                        <span class="text-xs font-semibold text-slate-300 truncate max-w-[100px]">${row.vendedor || '-'}</span>
                    </div>
                </td>
            </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;
        desktopView.innerHTML = tableHtml;

        contentWrapper.appendChild(mobileView);
        contentWrapper.appendChild(desktopView);
        section.appendChild(contentWrapper);
        container.appendChild(section);
    });

    // Re-iniciar íconos en el DOM inyectado dinámicamente
    lucide.createIcons();
}

// ============== Renderizado Transporte Externo ==============
function renderExterno(dataList) {
    const container = document.getElementById('contentExterno');
    container.innerHTML = '';

    if (dataList.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 animate-fade-in text-center">
                <div class="bg-surface p-6 rounded-full inline-block mb-4 shadow-lg border border-border">
                    <i data-lucide="clipboard-x" class="h-12 w-12 text-slate-500"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-300">No hay datos de Transporte Externo</h3>
                <p class="text-slate-500 mt-2 text-sm max-w-sm">No se encontraron registros de transporte externo hoy.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const section = document.createElement('div');
    section.className = `bg-surface/50 border border-border shadow-2xl rounded-2xl overflow-hidden glass-panel mb-8 animate-fade-in`;

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'overflow-x-auto p-0 md:p-4';

    let tableHtml = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="text-xs uppercase tracking-wider text-slate-400 bg-slate-900 border-y border-border shadow-inner">
                    <th class="px-5 py-3.5 font-semibold text-center" style="width: 140px;">Estado</th>
                    <th class="px-5 py-3.5 font-semibold" style="width: 120px;">Fecha</th>
                    <th class="px-5 py-3.5 font-semibold" style="max-width: 250px;">Cliente / Razón Social</th>
                    <th class="px-5 py-3.5 font-semibold" style="width: 100px;">Factura</th>
                    <th class="px-5 py-3.5 font-semibold" style="width: 100px;">OT</th>
                    <th class="px-5 py-3.5 font-semibold" style="width: 80px;">KG</th>
                    <th class="px-5 py-3.5 font-semibold">Proveedor</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-border text-sm">
    `;

    dataList.forEach(row => {
        const badgeClass = getBadgeStyles(row.estado);
        const fechaFormat = row.fecha ? row.fecha.split(' ')[0] : '-'; // Solo tomamos la fecha

        tableHtml += `
        <tr class="hover:bg-slate-800/30 transition-colors group">
            <td class="px-5 py-4 whitespace-nowrap">
                <div class="flex flex-col items-center gap-2">
                    <span class="px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm inline-block text-center w-full min-w-[110px] tracking-wide ${badgeClass}">
                        ${row.estado || 'N/A'}
                    </span>
                </div>
            </td>
            <td class="px-5 py-4 whitespace-nowrap">
                <div class="font-bold text-teal-400 text-sm drop-shadow-md">
                    ${fechaFormat}
                </div>
            </td>
            <td class="px-5 py-4">
                <div class="font-bold text-sm text-white break-words drop-shadow-md leading-tight group-hover:text-blue-200 transition-colors">
                    ${row.razonSocial || '-'}
                </div>
                <div class="text-[10px] text-slate-400 font-mono mt-1">
                    ${row.cliente ? 'RUT: ' + row.cliente : ''}
                </div>
            </td>
            <td class="px-5 py-4 whitespace-nowrap font-mono text-slate-300 font-medium">
                ${row.factura || '-'}
            </td>
            <td class="px-5 py-4 whitespace-nowrap font-mono text-slate-300">
                ${row.ot || '-'}
            </td>
            <td class="px-5 py-4 whitespace-nowrap text-amber-400 font-bold">
                ${row.kg ? row.kg : '-'}
            </td>
            <td class="px-5 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2 text-slate-300">
                    <i data-lucide="truck" class="h-4 w-4 text-indigo-400"></i>
                    <span class="font-medium uppercase">${row.proveedor || '-'}</span>
                </div>
            </td>
        </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;

    tableWrapper.innerHTML = tableHtml;
    section.appendChild(tableWrapper);
    container.appendChild(section);

    lucide.createIcons();
}
