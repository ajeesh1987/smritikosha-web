// src/ui/toast.js
export function showToast(message, success = true) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'fixed bottom-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white text-sm transition-opacity opacity-0 pointer-events-none';
      document.body.appendChild(toast);
    }
  
    toast.textContent = message;
    toast.className = `fixed bottom-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white text-sm opacity-100 pointer-events-auto ${
      success ? 'bg-green-600' : 'bg-red-600'
    }`;
  
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0');
      toast.classList.add('pointer-events-none');
    }, 2500);
  }
  