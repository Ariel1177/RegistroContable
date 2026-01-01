// Clase para manejar las transacciones
class TransactionManager {
    constructor() {
        this.storageKey = 'transactions';
        this.transactions = this.loadFromStorage();
    }

    // Cargar transacciones del localStorage
    loadFromStorage() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    // Guardar transacciones en localStorage
    saveToStorage() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.transactions));
    }

    // Agregar nueva transacción
    addTransaction(transaction) {
        const newTransaction = {
            id: Date.now(),
            date: transaction.date,
            description: transaction.description,
            amount: parseFloat(transaction.amount),
            category: transaction.category,
            type: transaction.type
        };
        this.transactions.push(newTransaction);
        this.saveToStorage();
        return newTransaction;
    }

    // Obtener transacción por ID
    getTransaction(id) {
        return this.transactions.find(t => t.id === id);
    }

    // Actualizar transacción
    updateTransaction(id, updatedData) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions[index] = {
                ...this.transactions[index],
                ...updatedData
            };
            this.saveToStorage();
            return this.transactions[index];
        }
        return null;
    }

    // Eliminar transacción
    deleteTransaction(id) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // Eliminar todas las transacciones
    clearAll() {
        this.transactions = [];
        this.saveToStorage();
    }

    // Obtener transacciones filtradas
    filterTransactions(searchTerm) {
        return this.transactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Calcular totales
    getCalculations() {
        const ingresos = this.transactions
            .filter(t => t.type === 'Ingreso')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const egresos = this.transactions
            .filter(t => t.type === 'Egreso')
            .reduce((sum, t) => sum + t.amount, 0);
        
        return {
            ingresos,
            egresos,
            balance: ingresos - egresos
        };
    }

    // Obtener transacciones ordenadas por fecha
    getSortedTransactions() {
        return [...this.transactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
    }
}

// Instancia global del gestor de transacciones
const manager = new TransactionManager();

// Variables globales para el modal
let currentEditingId = null;
const modal = document.getElementById('editModal');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelEdit');

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Establecer fecha actual en el input
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // Event listeners del formulario
    document.getElementById('transactionForm').addEventListener('submit', handleAddTransaction);

    // Event listeners de búsqueda
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Event listeners de botones
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('clearAllBtn').addEventListener('click', handleClearAll);

    // Event listeners del modal
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Event listener para el formulario de edición
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);

    // Cargar y mostrar transacciones
    displayTransactions();
    updateSummary();
}

// Manejar agregar transacción
function handleAddTransaction(e) {
    e.preventDefault();

    const transaction = {
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        amount: document.getElementById('amount').value,
        category: document.getElementById('category').value,
        type: document.getElementById('type').value
    };

    // Validación
    if (!transaction.date || !transaction.description || !transaction.amount || !transaction.category || !transaction.type) {
        alert('Por favor, rellena todos los campos');
        return;
    }

    manager.addTransaction(transaction);
    document.getElementById('transactionForm').reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    displayTransactions();
    updateSummary();

    // Mostrar mensaje de éxito
    showNotification('Transacción agregada exitosamente', 'success');
}

// Mostrar transacciones
function displayTransactions(transactionsToShow = null) {
    const listContainer = document.getElementById('transactionsList');
    const emptyState = document.getElementById('emptyState');
    
    const transactions = transactionsToShow || manager.getSortedTransactions();

    listContainer.innerHTML = '';

    if (transactions.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    transactions.forEach(transaction => {
        const element = createTransactionElement(transaction);
        listContainer.appendChild(element);
    });
}

// Crear elemento de transacción
function createTransactionElement(transaction) {
    const div = document.createElement('div');
    const typeClass = transaction.type === 'Ingreso' ? 'income' : 'expense';
    const sign = transaction.type === 'Ingreso' ? '+' : '-';
    const formattedAmount = formatCurrency(transaction.amount);

    div.className = `transaction-item ${typeClass}`;
    div.innerHTML = `
        <div class="transaction-info">
            <div class="transaction-date">${formatDate(transaction.date)}</div>
            <div class="transaction-description">${transaction.description}</div>
            <span class="transaction-category">${transaction.category}</span>
        </div>
        <div class="transaction-amount ${typeClass}">${sign}${formattedAmount}</div>
        <div class="transaction-actions">
            <button class="btn-edit btn-small" onclick="editTransaction(${transaction.id})">Editar</button>
            <button class="btn-delete btn-small" onclick="deleteTransaction(${transaction.id})">Eliminar</button>
        </div>
    `;

    return div;
}

// Editar transacción
function editTransaction(id) {
    const transaction = manager.getTransaction(id);
    if (!transaction) return;

    currentEditingId = id;

    // Llenar el formulario de edición
    document.getElementById('editDate').value = transaction.date;
    document.getElementById('editDescription').value = transaction.description;
    document.getElementById('editAmount').value = transaction.amount;
    document.getElementById('editCategory').value = transaction.category;
    document.getElementById('editType').value = transaction.type;

    // Abrir modal
    modal.classList.add('show');
}

// Manejar envío de edición
function handleEditSubmit(e) {
    e.preventDefault();

    if (!currentEditingId) return;

    const updatedData = {
        date: document.getElementById('editDate').value,
        description: document.getElementById('editDescription').value,
        amount: parseFloat(document.getElementById('editAmount').value),
        category: document.getElementById('editCategory').value,
        type: document.getElementById('editType').value
    };

    manager.updateTransaction(currentEditingId, updatedData);
    closeModal();
    displayTransactions();
    updateSummary();
    showNotification('Transacción actualizada exitosamente', 'success');
}

// Cerrar modal
function closeModal() {
    modal.classList.remove('show');
    currentEditingId = null;
    document.getElementById('editForm').reset();
}

// Eliminar transacción
function deleteTransaction(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
        manager.deleteTransaction(id);
        displayTransactions();
        updateSummary();
        showNotification('Transacción eliminada exitosamente', 'success');
    }
}

// Actualizar resumen
function updateSummary() {
    const { ingresos, egresos, balance } = manager.getCalculations();

    document.getElementById('totalIncome').textContent = formatCurrency(ingresos);
    document.getElementById('totalExpense').textContent = formatCurrency(egresos);
    
    const balanceElement = document.getElementById('totalBalance');
    balanceElement.textContent = formatCurrency(balance);
    balanceElement.style.color = balance >= 0 ? '#667eea' : '#dc3545';
}

// Manejar búsqueda
function handleSearch(e) {
    const searchTerm = e.target.value;
    
    if (searchTerm.trim() === '') {
        displayTransactions();
    } else {
        const filtered = manager.filterTransactions(searchTerm);
        displayTransactions(filtered);
    }
}

// Manejar limpiar todo
function handleClearAll() {
    if (confirm('¿Estás seguro de que deseas eliminar TODAS las transacciones? Esta acción no se puede deshacer.')) {
        manager.clearAll();
        displayTransactions();
        updateSummary();
        showNotification('Todas las transacciones fueron eliminadas', 'success');
    }
}

// Exportar a CSV
function exportToCSV() {
    if (manager.transactions.length === 0) {
        alert('No hay transacciones para exportar');
        return;
    }

    const { ingresos, egresos, balance } = manager.getCalculations();
    
    let csv = 'Fecha,Descripción,Categoría,Tipo,Monto\n';
    
    manager.getSortedTransactions().forEach(transaction => {
        const amount = transaction.type === 'Ingreso' ? transaction.amount : -transaction.amount;
        csv += `"${transaction.date}","${transaction.description}","${transaction.category}","${transaction.type}",${amount}\n`;
    });

    csv += '\n\nRESUMEN\n';
    csv += `Total Ingresos,${ingresos}\n`;
    csv += `Total Egresos,${egresos}\n`;
    csv += `Balance,${balance}\n`;

    // Crear y descargar archivo
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro_contable_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('CSV exportado exitosamente', 'success');
}

// Funciones auxiliares

// Formatear moneda
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Formatear fecha
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remover notificación después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
