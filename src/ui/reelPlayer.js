// src/ui/reelPlayer.js

import { gsap } from "gsap";

export function playReel({ title, theme, mood, musicStyle, visualFlow }) {
  const container = document.getElementById("reel-player");
  container.innerHTML = "";
  container.classList.remove("hidden");

  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white";
  container.appendChild(overlay);

  let index = 0;
// Create and configure audio player
const track = Math.random() > 0.5 ? '1' : '2';
const audio = new Audio(`/music/${track}.mp3`);
audio.volume = 0;
audio.loop = false;
audio.play();
gsap.to(audio, { volume: 0.4, duration: 3 }); // fade in

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

    overlay.innerHTML = "";
    const block = visualFlow[index];

    const img = document.createElement("img");
    img.src = block.imageUrl;
    img.className = "max-w-full max-h-full rounded-xl shadow-xl object-contain transition duration-1000 opacity-0";

    if (block.effect === "ghibli") {
      img.classList.add("saturate-150", "blur-sm", "contrast-125");
    } else if (block.effect === "map-travel") {
      img.classList.add("grayscale", "opacity-80");
    }

    overlay.appendChild(img);

    if (block.caption) {
      const caption = document.createElement("p");
      caption.textContent = block.caption;
      caption.className = "mt-4 text-center text-lg font-medium text-white drop-shadow";
      overlay.appendChild(caption);
    }

    const entryEffect = block.effect === "zoom"
      ? { opacity: 0, scale: 1.2 }
      : { opacity: 0, scale: 1.05 };

    const exitEffect = block.effect === "zoom"
      ? { opacity: 0, scale: 0.95 }
      : { opacity: 0, scale: 1.1 };

    gsap.fromTo(img, entryEffect, {
      opacity: 1,
      scale: 1,
      duration: 1.2,
      ease: "power2.out",
      onComplete: () => {
        setTimeout(() => {
          gsap.to(img, {
            ...exitEffect,
            duration: 1.2,
            ease: "power2.in",
            onComplete: () => {
              index++;
              playNext();
            }
          });
        }, (block.duration || 3.5) * 1000);
      }
    });
  };

  const titleCard = document.createElement("div");
  titleCard.className = "absolute inset-0 flex flex-col items-center justify-center bg-black text-white";
  titleCard.innerHTML = `
    <h1 class="text-3xl md:text-5xl font-bold mb-2">${title}</h1>
    <p class="text-sm text-gray-300 italic">${theme} &mdash; ${mood}</p>
  `;
  overlay.appendChild(titleCard);

  setTimeout(() => {
    gsap.to(titleCard, {
      opacity: 0,
      duration: 1.5,
      onComplete: () => {
        titleCard.remove();
        playNext();
      }
    });
  }, 3000);
}
