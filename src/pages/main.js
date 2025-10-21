import { supabase } from '../../lib/supabaseClient.js';
import { checkAndCreateUserProfile } from './profile.js';
import { openImageUpload, closeImageUpload } from './upload.js';
import { showToast } from '../ui/toast.js';
import { startSessionTimeout } from './sessionTimeout.js';
import { setupImageModalEvents } from '../ui/imageModal.js';

const memoryList = document.getElementById('memory-list');
const memoryModal = document.getElementById('memory-modal');
const imageModal = document.getElementById('image-modal');
const memoryForm = document.getElementById('memory-form');
const toast = document.getElementById('toast');
const modalImg = document.getElementById('modal-image');
const modalLocation = document.getElementById('modal-location');
const modalDescription = document.getElementById('modal-description');
const modalInfoPanel = document.getElementById('modal-info-panel');
const modalPrev = document.getElementById('modal-prev');
const modalNext = document.getElementById('modal-next');
const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');
const logoutBtn = document.getElementById('logout-btn');
const locationInput = document.getElementById('image-location');
const suggestionsBox = document.getElementById('location-suggestions');

setupImageModalEvents(); 

window.openMemoryModal = () => {
  if (!memoryModal) return;
  memoryModal.style.display = 'flex';
  memoryModal.classList.remove('hidden');
  memoryModal.classList.add('flex');
  document.getElementById('memory-title')?.focus();
};

window.closeMemoryModal = () => {
  if (!memoryModal) return;
  memoryModal.classList.add('hidden');
  memoryModal.classList.remove('flex');
  memoryModal.style.display = 'none';
  memoryForm?.reset();
  const submitBtn = document.getElementById('memory-submit-btn');
  if (submitBtn) {
    submitBtn.textContent = 'Create';
    submitBtn.disabled = false;
  }
};

window.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;
  if (!/main(\.html)?$/.test(path)) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  window.currentUser = user;

  if (!user) {
    window.location.replace('/login.html');
    return;
  }

  // absolute expiry guard
  const expiresAt = Number(localStorage.getItem('sk.session.expiresAt') || 0);
  const issuedAt = Number(localStorage.getItem('sk.session.issuedAt') || 0);
  const ABSOLUTE_MAX_MINUTES = 30;

  if (!expiresAt || Date.now() > expiresAt || (issuedAt && Date.now() - issuedAt > ABSOLUTE_MAX_MINUTES * 60 * 1000)) {
    await supabase.auth.signOut();
    window.location.replace('/login.html');
    return;
  }

  // safe to proceed
  startSessionTimeout(1);

  try {
    await checkAndCreateUserProfile(user);
  } catch (err) {
    console.warn('Profile setup skipped:', err.message);
  }

  // continue with loadMemories etc...


  const addMemoryBtn = document.getElementById('add-memory-btn');
  if (addMemoryBtn) {
    addMemoryBtn.addEventListener('click', openMemoryModal);

    const ghibliBtn = document.createElement('button');
    ghibliBtn.textContent = '✨ Myazora-fy an Image';
    ghibliBtn.className = 'bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition';
    ghibliBtn.style.marginLeft = '0.5rem';
    ghibliBtn.onclick = () => window.location.href = '/myazora.html';
    addMemoryBtn.parentNode.insertBefore(ghibliBtn, addMemoryBtn.nextSibling);
  }

  // ✅ Load memories before binding cancel, so DOM is guaranteed ready
  await loadMemories();

  // ✅ Fix: Cancel button listener must be attached *after* DOM load
  const cancelBtn = document.getElementById('cancel-memory-btn');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.closeMemoryModal();
    });
  }
const summarizeBtn = document.getElementById('summarize-memory');
if (summarizeBtn) {
  summarizeBtn.classList.remove('hidden'); // Ensure the button is visible
}

// Add event listener for the Summarize button
summarizeBtn?.addEventListener("click", async () => {
  const memoryId = getMemoryId(); // Get the memory ID for the memory being summarized

  if (!memoryId) {
    alert("No memory selected.");
    return;
  }

  // Show loading spinner and disable actions
  toggleLoading(true);

  try {
    // Send a POST request to summarize the memory
    const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

const response = await fetch("/api/memory/summarize", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({ memoryId }),
});

if (!response.ok) throw new Error("Failed to summarize");
const { summary } = await response.json();
displaySummary(memoryId, summary);


  } catch (error) {
    console.error("Error summarizing memory:", error);
  } finally {
    // Hide loading spinner and re-enable actions
    toggleLoading(false);
  }
});

});

// Function to get the memory ID (ensure this is correct in your modal context)
function getMemoryId() {
  return document.getElementById("memory-id").value; // Ensure the memory ID is set properly in your modal
}







let modalImages = [], modalLocations = [], modalDescriptions = [], modalIds = [];
let currentImageIndex = 0;
let currentMemoryId = null;

// TOAST
function toggleLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  if (!spinner) return;

  if (show) {
    spinner.classList.remove('hidden');
    spinner.classList.add('flex');
  } else {
    spinner.classList.add('hidden');
    spinner.classList.remove('flex');
  }
}

// 👇 Enhancing displaySummary function in main.js to show buttons
function displaySummary(memoryId, summary) {
  let container = document.querySelector(`[data-summary-id="${memoryId}"]`);

  if (!container) {
    const memoryCard = document.querySelector(`[data-memory-id="${memoryId}"]`);
    container = document.createElement('div');
    container.className = 'mt-3 bg-indigo-50 text-indigo-800 p-3 rounded shadow-sm space-y-2';
    container.setAttribute('data-summary-id', memoryId);
    memoryCard.appendChild(container);
  }

  container.innerHTML = `
  <p class="text-sm text-indigo-900 leading-relaxed">${summary}</p>
  <div class="flex gap-3 items-center text-sm pt-2">
    <button class="save-summary-btn bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded" data-id="${memoryId}">Save</button>
    <button class="retry-summary-btn bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded" data-id="${memoryId}">Regenerate</button>
    <button class="clear-summary-btn bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded" data-id="${memoryId}">Dismiss</button>
    <span class="summary-status text-xs text-gray-500 italic ml-2"></span>
  </div>
`;


  const saveBtn = container.querySelector('.save-summary-btn');
  const retryBtn = container.querySelector('.retry-summary-btn');
  const clearBtn = container.querySelector('.clear-summary-btn');
  const statusText = container.querySelector('.summary-status');

  saveBtn.addEventListener('click', async () => {
    statusText.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/memory/saveSummary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memoryId, summary }),
      });

      const result = await res.json();
      if (res.ok) {
        statusText.textContent = '✅ Saved';
      } else {
        console.error(result.error);
        statusText.textContent = '❌ Failed to save';
      }
    } catch (err) {
      console.error(err);
      statusText.textContent = '❌ Error';
    } finally {
      saveBtn.disabled = false;
      setTimeout(() => (statusText.textContent = ''), 2000);
    }
  });

  retryBtn.addEventListener('click', async () => {
    statusText.textContent = 'Retrying...';
    retryBtn.disabled = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/memory/summarizeText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memoryId }),
      });

      const result = await res.json();
      if (res.ok) {
        displaySummary(memoryId, result.summary);
      } else {
        console.error(result.error);
        statusText.textContent = '❌ Retry failed';
      }
    } catch (err) {
      console.error(err);
      statusText.textContent = '❌ Error';
    } finally {
      retryBtn.disabled = false;
      setTimeout(() => (statusText.textContent = ''), 2000);
    }
  });

  clearBtn.addEventListener('click', () => {
    container.remove();
  });
}





// MODAL NAVIGATION
function updateImageModalContent() {
  modalImg.src = modalImages[currentImageIndex];
  modalLocation.textContent = modalLocations[currentImageIndex] || '';

  const description = modalDescriptions[currentImageIndex]?.trim();

  const panelWrapper = document.getElementById('modal-info-panel');

  if (description) {
    panelWrapper.classList.remove('hidden');
    modalDescription.textContent = description;
  } else {
    panelWrapper.classList.add('hidden');
    modalDescription.textContent = '';
  }
}



modalPrev.onclick = () => {
  currentImageIndex = (currentImageIndex - 1 + modalImages.length) % modalImages.length;
  updateImageModalContent();
};
modalNext.onclick = () => {
  currentImageIndex = (currentImageIndex + 1) % modalImages.length;
  updateImageModalContent();
};
window.addEventListener('keydown', e => {
  if (!imageModal.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') modalPrev.click();
    if (e.key === 'ArrowRight') modalNext.click();
if (e.key === 'Escape') window.closeImageModal();
  }
});
let touchStartX = 0;

modalImg.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
modalImg.addEventListener('touchend', e => {
  const deltaX = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(deltaX) > 50) deltaX < 0 ? modalNext.click() : modalPrev.click();
});




// PROFILE
profileBtn?.addEventListener('click', () => profileMenu.classList.toggle('hidden'));
logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});
document.addEventListener('click', e => {
  if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
    profileMenu.classList.add('hidden');
  }
});



// Reuse autocomplete for both image and memory location inputs
function setupLocationAutocomplete(inputId, suggestionsId) {
  const input = document.getElementById(inputId);
  const suggestions = document.getElementById(suggestionsId);
  if (!input || !suggestions) return;

  let debounceTimeout, activeIndex = -1;

  input.addEventListener('input', () => {
    const query = input.value.trim();
    clearTimeout(debounceTimeout);
    if (query.length < 3) return suggestions.classList.add('hidden');

    debounceTimeout = setTimeout(async () => {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const results = await res.json();
      suggestions.innerHTML = '';
      results.slice(0, 5).forEach((place, i) => {
        const li = document.createElement('li');
        li.className = 'cursor-pointer px-3 py-2 hover:bg-indigo-50 flex gap-2';
        li.innerHTML = `<i class='fas fa-map-marker-alt text-indigo-500'></i><span>${place.display_name}</span>`;
        li.dataset.lat = place.lat;
        li.dataset.lon = place.lon;
        li.onclick = () => {
          input.value = place.display_name;
          input.dataset.lat = place.lat;
          input.dataset.lon = place.lon;
          suggestions.classList.add('hidden');
        };
        suggestions.appendChild(li);
      });
      activeIndex = -1;
      suggestions.classList.remove('hidden');
    }, 300);
  });

  input.addEventListener('keydown', e => {
    const items = suggestions.querySelectorAll('li');
    if (suggestions.classList.contains('hidden') || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      items[activeIndex].click();
    } else if (e.key === 'Escape') {
      suggestions.classList.add('hidden');
    }

    items.forEach((el, i) => el.classList.toggle('bg-indigo-100', i === activeIndex));
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !suggestions.contains(e.target))
      suggestions.classList.add('hidden');
  });
}

// ✅ Initialize for both forms
setupLocationAutocomplete('image-location', 'location-suggestions');
setupLocationAutocomplete('memory-location', 'memory-location-suggestions');





window.openImageUpload = openImageUpload;

window.closeImageUpload = closeImageUpload;

memoryForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const title = document.getElementById('memory-title')?.value.trim();
  const location = document.getElementById('memory-location')?.value.trim();
  const tags = document.getElementById('memory-tags')?.value.trim();
  const description = document.getElementById('memory-description')?.value.trim();

  if (!title) {
    showToast('Memory title is required', false);
    return;
  }

  const submitBtn = document.getElementById('memory-submit-btn');
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    showToast('No user session found', false);
    return;
  }

 const { error } = await supabase.from('memories').insert([{
  title,
  location,
  tags,
  description,
  user_id: user.id,
  created_at: new Date().toISOString() // add this
}]);


  if (error) {
    console.error('Error adding memory:', error.message);
    showToast('Failed to add memory', false);
  } else {
    showToast('Memory added');
window.closeMemoryModal();
    await loadMemories(); // Refresh the memory list
  }


  submitBtn.textContent = 'Create';
  submitBtn.disabled = false;
});


// Custom Confirm Dialog Logic
const confirmDialog = document.getElementById('confirm-dialog');
const confirmMessage = document.getElementById('confirm-message');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmOk = document.getElementById('confirm-ok');

window.showConfirm = function (message) {
  return new Promise(resolve => {
    confirmMessage.textContent = message;
    confirmDialog.classList.remove('hidden');
    confirmDialog.classList.add('flex');

    const close = () => {
      confirmDialog.classList.add('hidden');
      confirmDialog.classList.remove('flex');
    };

    confirmCancel.onclick = () => {
      close();
      resolve(false);
    };
    confirmOk.onclick = () => {
      close();
      resolve(true);
    };
  });
};





window.deleteMemory = async (id) => {
  const confirmed = await showConfirm('Delete memory and all its images?');
  if (!confirmed) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    showToast('User not found', false);
    return;
  }

  // 1) Get all storage keys (exact file paths) from DB for this memory
  const { data: imgs, error: imgsErr } = await supabase
    .from('memory_images')
    .select('image_path')
    .eq('memory_id', id);

  if (imgsErr) {
    console.warn('Could not list memory images:', imgsErr.message);
  }

  // 2) Delete those files from storage in batches
 // 2) Delete those files from storage (batch in chunks)
try {
  const paths = (imgs || []).map(i => i.image_path);
  if (paths.length > 0) {
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error: delErr } = await supabase.storage
        .from('memory-images')
        .remove(batch);
      if (delErr) console.warn('Storage delete batch failed:', delErr.message);
    }
  }
} catch (err) {
  console.warn('Storage deletion error:', err.message);
}


  // 3) (Optional fallback) If there were no DB rows (legacy case),
  // try listing the folder and deleting whatever is inside.
  if (!imgs || imgs.length === 0) {
    try {
      const prefix = `${user.id}/${id}`;
      const { data: listed, error: listErr } = await supabase.storage
        .from('memory-images')
        .list(prefix); // lists one level inside <userId>/<memoryId>

      if (!listErr && listed && listed.length > 0) {
        const folderFileKeys = listed.map(obj => `${prefix}/${obj.name}`);
        const { error: delErr2 } = await supabase.storage
          .from('memory-images')
          .remove(folderFileKeys);
        if (delErr2) console.warn('Fallback storage delete failed:', delErr2.message);
      }
    } catch (e) {
      console.warn('Fallback list/remove failed:', e.message);
    }
  }

  // 4) Delete DB rows
  await supabase.from('memory_images').delete().eq('memory_id', id);
  const { error: memErr } = await supabase.from('memories').delete().eq('id', id);

  // 5) UI cleanup
  if (!memErr) {
    const card = document.querySelector(`[data-memory-id="${id}"]`);
    card?.classList.add('opacity-0');
    setTimeout(() => card?.remove(), 300);
    showToast('Memory deleted');
  } else {
    console.error('Delete failed:', memErr.message);
    showToast('Failed to delete memory', false);
  }
};



window.deleteImage = async (id, btn) => {
  const confirmed = await window.showConfirm('Delete this image?');
  if (!confirmed) return;

  // Fetch image path before deletion
  const { data: imageData, error: fetchError } = await supabase
    .from('memory_images')
    .select('image_path')
    .eq('id', id)
    .single();

  if (fetchError || !imageData) {
    console.error('Fetch error:', fetchError);
    showToast('Could not find image path', false);
    return;
  }

  // Delete from storage
  const { error: storageError } = await supabase
    .storage
    .from('memory-images')
    .remove([imageData.image_path]);

  if (storageError) {
    console.error('Storage delete error:', storageError);
    showToast('Failed to delete from storage', false);
    return;
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('memory_images')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('Delete error:', dbError);
    showToast('Failed to delete image from database', false);
    return;
  }

  showToast('Image deleted');

  // Remove thumbnail from DOM
  const card = btn.closest('.relative');
  card?.classList.add('opacity-0');
  setTimeout(() => card?.remove(), 300);

  // Remove from modal arrays
  const deletedIndex = modalIds.findIndex(imgId => imgId === id);
  if (deletedIndex !== -1) {
    modalImages.splice(deletedIndex, 1);
    modalDescriptions.splice(deletedIndex, 1);
    modalLocations.splice(deletedIndex, 1);
    modalIds.splice(deletedIndex, 1);

    // Adjust current index
    if (currentImageIndex > deletedIndex) {
      currentImageIndex--;
    }
    if (currentImageIndex >= modalImages.length) {
      currentImageIndex = modalImages.length - 1;
    }

    // Refresh modal or close
    if (modalImages.length > 0 && currentImageIndex >= 0) {
      updateImageModalContent();
    } else {
      closeImageModal();
    }
  }
};


async function loadMemories() {

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: memories } = await supabase.from('memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  console.log('Memories:', memories.map(m => m.id));

  const { data: images } = await supabase
  .from('memory_images')
  .select('*')
  .eq('user_id', user.id); // ✅ filter to only user's images
  memoryList.innerHTML = '';

  for (const memory of memories) {
const related = images.filter(i => String(i.memory_id) === String(memory.id));
    const urls = await Promise.all(
      related.map(img => supabase.storage.from('memory-images').createSignedUrl(img.image_path, 3600).then(({ data }) => data?.signedUrl))
    );
    console.log(memory.id, {
  title: memory.title,
  desc: memory.description,
  loc: memory.location,
  related: related.length
});

    const valid = urls.filter(Boolean);
    const locations = related.map(i => i.location || '');
    const descriptions = related.map(i => i.description || '');
    const ids = related.map(i => i.id);
    const card = document.createElement('div');
    card.setAttribute('data-memory-id', memory.id);
    card.className = 'bg-white p-4 border border-gray-200 rounded-lg shadow-sm';
    card.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h3 class='text-lg font-bold text-indigo-700'>${memory.title}</h3>
        <div class="flex gap-2">
  ${
  (() => {
    const hasDescriptiveInfo =
      Boolean(memory.description || memory.tags || memory.location) ||
      related.some(img => img.description || img.tags || img.location);

    const hasImages = related.length > 0;
    const hasEnoughForReel = related.length >= 3;

    let html = '';

    if (hasDescriptiveInfo && hasImages) {
      html += `
        <button class="summarize-btn text-indigo-600 hover:text-indigo-800" 
                data-memory-id="${memory.id}" 
                title="Summarize this memory">
          <i class="fas fa-magic"></i>
        </button>`;
    }

    if (hasEnoughForReel) {
      html += `
        <button class="reel-btn text-purple-600 hover:text-purple-800" 
                data-memory-id="${memory.id}" 
                title="Create Reel">
          <i class="fas fa-film"></i>
        </button>`;
    }

    return html;
  })()
}


<button onclick="openImageUpload('${memory.id}')"><i class="fas fa-plus text-indigo-600 hover:text-indigo-800"></i></button>
          <button onclick="deleteMemory('${memory.id}')"><i class="fas fa-trash text-red-500 hover:text-red-700"></i></button>
        </div>
      </div>
      ${memory.location ? `<p class='text-sm text-gray-600 mb-1'>📍 ${memory.location}</p>` : ''}
      ${memory.tags ? `<div class="mb-2">${memory.tags.split(/[, ]+/).map(tag => `<span class='inline-block bg-indigo-100 text-indigo-700 text-xs font-medium mr-1 px-2 py-1 rounded-full'>${tag}</span>`).join('')}</div>` : ''}
      <div class="flex flex-wrap gap-2">
        ${valid.map((url, i) => `
          <div class="relative w-28 h-28">
<img 
  src="${url}" 
  data-description="${descriptions[i] || ''}" 
  data-location="${locations[i] || ''}" 
  data-image-id="${ids[i]}" 
  class="w-full h-full object-cover rounded-lg cursor-pointer border hover:ring-2 hover:ring-indigo-300"
onclick="openImageModal(event, '${url}', ${i})"
/>
            <button onclick="deleteImage('${ids[i]}', this)" class="absolute top-0 right-0 mt-1 mr-1 bg-white rounded-full p-1 shadow-md">
              <i class="fas fa-trash text-red-500 hover:text-red-700"></i>
            </button>
          </div>`).join('')}
      </div>`;
    memoryList.appendChild(card);
    // Bind event listeners to all reel buttons


  }

  document.getElementById('map-feature-card')?.classList.remove('hidden');



  function bindReelButtonEvents() {
    document.querySelectorAll('.reel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const memoryId = btn.getAttribute('data-memory-id');
        if (!memoryId) return;
  
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
        btn.disabled = true;
  
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
  
          const res = await fetch('/api/memory/reel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ memoryId }),
          });
  
          if (!res.ok) throw new Error('Failed to load reel');
  
          const reelData = await res.json();
  
          // ⬇️ Launch the reel using updated playReel
          import('../ui/reelPlayer.js').then(({ playReel }) => {
            playReel({
              title: reelData.title,
              theme: reelData.theme,
              mood: reelData.mood,
              musicStyle: reelData.musicStyle,
              visualFlow: reelData.visualFlow,
            });
          });
  
        } catch (err) {
          console.error('Reel generation failed:', err);
          showToast('Could not load reel.', false);
        } finally {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }
      });
    });
  }
  

function bindSummarizeButtonEvents() {
  document.querySelectorAll('.summarize-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const memoryId = btn.getAttribute('data-memory-id');
      if (!memoryId) return;

      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Summarizing...`;
      btn.disabled = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch('/api/memory/summarizeText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ memoryId }),
        });

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const { summary } = await response.json();
        displaySummary(memoryId, summary);
      } catch (err) {
        console.error('Summarize error:', err);
        showToast('Failed to summarize memory', false);
      } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    });
  });
}
bindReelButtonEvents();
bindSummarizeButtonEvents();


}
window.loadMemories = loadMemories;

// Close memory modal on Escape key or outside click
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !memoryModal.classList.contains('hidden')) {
    window.closeMemoryModal();
  }
});

// Close image modal if clicked outside the image
document.getElementById('image-modal').addEventListener('click', e => {
  // Only close if the backdrop itself is clicked (not the image or info panel)
 if (e.target === e.currentTarget) {
  window.closeImageModal();
}

});

if (memoryModal) {
  memoryModal.addEventListener('click', e => {
    if (e.target === memoryModal) window.closeMemoryModal();
  });
}


import { openImageModalFromMap } from '../ui/imageModal.js';

window.openImageModal = function (event, clickedUrl, indexGuess = 0) {
  if (!event.target.matches('img')) return;

  const memoryCard = event.target.closest('[data-memory-id]');
  if (!memoryCard) {
    console.warn('Memory card not found');
    return;
  }

  const allThumbs = memoryCard.querySelectorAll('img');

  modalImages = [];
  modalDescriptions = [];
  modalLocations = [];
  modalIds = [];

  let matchedIndex = 0;

  allThumbs.forEach((img, i) => {
    const wrapper = img.closest('[data-image-id]');
    if (!wrapper) return;

    const id = wrapper.dataset.imageId;
    const url = img.getAttribute('src');
    const desc = img.getAttribute('data-description') || '';
    const loc = img.getAttribute('data-location') || '';

    modalImages.push(url);
    modalDescriptions.push(desc);
    modalLocations.push(loc);
    modalIds.push(id);

    if (url === clickedUrl) matchedIndex = i;
  });

  currentImageIndex = matchedIndex;
  updateImageModalContent();
  imageModal.classList.remove('hidden');
};

window.closeImageModal = function () {
  imageModal.classList.add('hidden');
};

modalPrev?.addEventListener('click', () => {
  if (modalImages.length > 1) {     // ✅ use modalImages
    currentImageIndex = (currentImageIndex - 1 + modalImages.length) % modalImages.length;
    updateImageModalContent();       // ✅ use updateImageModalContent
  }
});

modalNext?.addEventListener('click', () => {
  if (modalImages.length > 1) {     // ✅ use modalImages
    currentImageIndex = (currentImageIndex + 1) % modalImages.length;
    updateImageModalContent();       // ✅ use updateImageModalContent
  }
});