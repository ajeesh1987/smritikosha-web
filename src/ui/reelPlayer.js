// src/ui/reelPlayer.js
import { gsap } from "gsap";

export function playReel({ title, theme, mood, musicStyle, visualFlow }) {
  const container = document.getElementById("reel-player");
  container.innerHTML = "";
  container.classList.remove("hidden");
  container.className = "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-gray-900";

  const overlay = document.createElement("div");
  overlay.className = "relative w-full h-full flex flex-col items-center justify-center overflow-hidden";
  container.appendChild(overlay);

  const track = Math.random() > 0.5 ? '1' : '2';
  const audio = new Audio(`/music/${track}.mp3`);
  audio.volume = 0;
  audio.loop = false;
  audio.play();
  gsap.to(audio, { volume: 0.4, duration: 3 });

  let index = 0;
  const preloadImages = visualFlow.map(v => {
    const img = new Image();
    img.src = v.imageUrl;
    return img.decode().catch(() => null);
  });

  Promise.all(preloadImages).then(() => {
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

      const frame = document.createElement("div");
      frame.className = "absolute inset-0 flex items-center justify-center transition-all duration-1000";

      const img = document.createElement("img");
      img.src = block.imageUrl;
      img.className = "max-w-[90%] max-h-[80%] object-contain rounded-2xl shadow-xl opacity-0";

      if (block.effect === "ghibli") {
        img.classList.add("saturate-150", "contrast-125", "brightness-105");
      }

      frame.appendChild(img);

      if (block.caption) {
        const caption = document.createElement("p");
        caption.textContent = block.caption;
        caption.className = "absolute bottom-8 w-full text-center text-xl font-medium text-gray-700 italic drop-shadow-sm";
        frame.appendChild(caption);
      }

      overlay.appendChild(frame);

      gsap.to(img, {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: "power2.out",
        onComplete: () => {
          setTimeout(() => {
            gsap.to(img, {
              opacity: 0,
              scale: 1.05,
              duration: 1.2,
              ease: "power2.in",
              onComplete: () => {
                index++;
                playNext();
              }
            });
          }, (block.duration || 3) * 1000);
        }
      });
    };

    const titleCard = document.createElement("div");
    titleCard.className = "absolute inset-0 flex flex-col items-center justify-center bg-white text-gray-800";
    titleCard.innerHTML = `
      <h1 class="text-4xl md:text-6xl font-bold mb-3">${title}</h1>
      <p class="text-lg text-gray-500 italic">${theme}  ${mood}</p>
    `;
    overlay.appendChild(titleCard);

    gsap.to(titleCard, {
      opacity: 0,
      duration: 1.5,
      delay: 2.5,
      onComplete: () => {
        titleCard.remove();
        playNext();
      }
    });
  });
}
