/* ==========================================================================
   Player Profile Module
   ========================================================================== */

const Profile = {
    data: {
        name: "Player 1",
        avatar: "user", 
        colorHex: PLAYER_COLORS[0].hex
    },

    load: () => {
        const saved = localStorage.getItem('snaked_profile');
        if (saved) {
            try {
                Profile.data = { ...Profile.data, ...JSON.parse(saved) };
            } catch (e) {
                console.error("Failed to parse profile", e);
            }
        }
    },

    save: () => {
        localStorage.setItem('snaked_profile', JSON.stringify(Profile.data));
    },
    
    getColorObj: () => {
        return PLAYER_COLORS.find(c => c.hex === Profile.data.colorHex) || PLAYER_COLORS[0];
    },

    renderMenuPanel: () => {
        const panel = document.getElementById('profile-panel');
        if (!panel) return;
        
        panel.innerHTML = '';

        const title = document.createElement('h3');
        title.className = 'text-slate-300 font-bold mb-4 uppercase tracking-widest text-sm';
        title.innerText = 'Your Online Profile';
        panel.appendChild(title);

        // Name Input
        const nameGroup = document.createElement('div');
        nameGroup.className = 'mb-4';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = Profile.data.name;
        nameInput.maxLength = 12;
        nameInput.className = 'w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-bold focus:border-emerald-500 focus:outline-none transition-colors';
        nameInput.placeholder = 'Enter Name';
        nameInput.onchange = (e) => {
            Profile.data.name = e.target.value.trim() || "Player";
            Profile.save();
        };
        nameGroup.appendChild(nameInput);
        panel.appendChild(nameGroup);

        // Avatar Preview & Selector
        const avatarGroup = document.createElement('div');
        avatarGroup.className = 'mb-4 flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-700';
        
        const avatarPreview = document.createElement('div');
        avatarPreview.className = 'w-10 h-10 flex items-center justify-center text-slate-300';
        avatarPreview.innerHTML = ICONS[Profile.data.avatar] || ICONS.user;
        
        const avatarBtn = document.createElement('button');
        avatarBtn.className = 'text-xs font-bold text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded';
        avatarBtn.innerText = 'Change Avatar';
        
        const availableAvatars = ['user', 'bot', 'trophy', 'star', 'fire']; // some icon keys
        avatarBtn.onclick = () => {
            let idx = availableAvatars.indexOf(Profile.data.avatar);
            idx = (idx + 1) % availableAvatars.length;
            Profile.data.avatar = availableAvatars[idx];
            Profile.save();
            Profile.renderMenuPanel();
        };

        avatarGroup.appendChild(avatarPreview);
        avatarGroup.appendChild(avatarBtn);
        panel.appendChild(avatarGroup);

        // Color Picker
        const colorGroup = document.createElement('div');
        colorGroup.className = 'flex flex-wrap gap-2';
        PLAYER_COLORS.forEach(c => {
            const dot = document.createElement('div');
            const isSelected = Profile.data.colorHex === c.hex;
            dot.className = `w-8 h-8 rounded-full cursor-pointer transition-all ${isSelected ? 'scale-110 ring-2 ring-white shadow-lg' : 'opacity-50 hover:opacity-100 hover:scale-105'}`;
            dot.style.backgroundColor = c.hex;
            dot.onclick = () => { 
                Profile.data.colorHex = c.hex; 
                Profile.save();
                Profile.renderMenuPanel();
            };
            colorGroup.appendChild(dot);
        });
        panel.appendChild(colorGroup);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Profile.load();
    Profile.renderMenuPanel();
});

window.Profile = Profile;
