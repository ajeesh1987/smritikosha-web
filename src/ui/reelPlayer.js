// src/ui/reelPlayer.js
import { gsap } from "gsap";

export function playReel({ title, theme, mood, musicStyle, visualFlow }) {
  const container = document.getElementById("reel-player");
  container.innerHTML = "";
  container.classList.remove("hidden");

  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black z-50 overflow-hidden";
  container.appendChild(overlay);

  const audio = new Audio(`/music/${Math.random() > 0.5 ? '1' : '2'}.mp3`);
  audio.volume = 0;
  audio.loop = false;
  audio.play();
  gsap.to(audio, { volume: 0.4, duration: 3 });

  let index = 0;
  let currentLayer = 0;

  const layers = [createLayer(), createLayer()];
  layers.forEach(layer => overlay.appendChild(layer));

  function createLayer() {
    const layer = document.createElement("div");
    layer.className = "absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000";
    return layer;
  }

  function setImageContent(layer, block) {
    layer.innerHTML = "";

    const img = document.createElement("img");
    img.src = block.imageUrl;
    img.className = "max-w-full max-h-full rounded-xl shadow-xl object-contain";

    if (block.effect === "ghibli") {
      img.classList.add("saturate-150", "contrast-125", "shadow-2xl");
    } else if (block.effect === "map-travel") {
      img.classList.add("grayscale", "opacity-80");
    }

    layer.appendChild(img);

    if (block.caption) {
      const caption = document.createElement("p");
      caption.textContent = block.caption;
      caption.className = "mt-4 text-center text-lg font-medium text-white drop-shadow";
      layer.appendChild(caption);
    }
  }

  const playNext = () => {
    if (index >= visualFlow.length) {
      gsap.to(audio, {
        volume: 0,
        duration: 2,
        onComplete: () => audio.pause()
      });
      setTimeout(() => container.classList.add("hidden"), 1000);
      return;
    }

    const block = visualFlow[index];
    const current = layers[currentLayer];
    const next = layers[1 - currentLayer];

    setImageContent(next, block);

    gsap.set(next, { opacity: 0, zIndex: 10 });
    gsap.set(current, { zIndex: 5 });

    gsap.to(next, {
      opacity: 1,
      duration: 1.2,
      ease: "power2.out",
      onComplete: () => {
        index++;
        currentLayer = 1 - currentLayer;
        setTimeout(() => playNext(), (block.duration || 3.5) * 1000);
      }
    });
  };

  const titleCard = document.createElement("div");
  titleCard.className = "absolute inset-0 flex flex-col items-center justify-center bg-black text-white z-20";
  titleCard.innerHTML = `
    <h1 class="text-3xl md:text-5xl font-bold mb-2">${title}</h1>
    <p class="text-sm text-gray-300 italic">${theme} &mdash; ${mood}</p>
  `;
  overlay.appendChild(titleCard);

  gsap.to(titleCard, {
    delay: 3,
    opacity: 0,
    duration: 1.5,
    onComplete: () => {
      titleCard.remove();
      playNext();
    }
  });
}
