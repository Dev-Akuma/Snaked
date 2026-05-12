/* ==========================================================================
   Player Profile Module
   ========================================================================== */

const Profile = {
    data: {
        name: "Player 1",
        avatar: "user", 
        colorHex: PLAYER_COLORS[0].hex
    },
    avatars: [
        { id: 'user', label: 'Target' },
        { id: 'bot', label: 'Bot' },
        { id: 'trophy', label: 'Trophy' },
        { id: 'star', label: 'Star' },
        { id: 'fire', label: 'Comet' },
        { id: 'snake', label: 'Snake' },
        { id: 'dice1', label: 'Dice One' },
        { id: 'dice3', label: 'Dice Three' },
        { id: 'flower', label: 'Flower' },
        { id: 'petals', label: 'Petals' }
    ],

    normalizeAvatar: (avatarId) => {
        const option = Profile.avatars.find((entry) => entry.id === avatarId);
        return option ? option.id : Profile.avatars[0].id;
    },

    getAvatarOption: (avatarId) => {
        return Profile.avatars.find((entry) => entry.id === avatarId) || Profile.avatars[0];
    },

    load: () => {
        const saved = localStorage.getItem('snaked_profile');
        if (saved) {
            try {
                Profile.data = { ...Profile.data, ...JSON.parse(saved) };
                Profile.data.avatar = Profile.normalizeAvatar(Profile.data.avatar);
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

    cycleAvatar: (direction) => {
        const currentIndex = Profile.avatars.findIndex((entry) => entry.id === Profile.data.avatar);
        const nextIndex = (currentIndex + direction + Profile.avatars.length) % Profile.avatars.length;
        Profile.data.avatar = Profile.avatars[nextIndex].id;
        Profile.save();
        Profile.renderMenuPanel();
    },

    renderMenuPanel: () => {
        const panel = document.getElementById('profile-panel');
        if (!panel) return;
        
        panel.innerHTML = '';

        const shell = document.createElement('div');
        shell.className = 'menu-profile-shell';

        const avatarRow = document.createElement('div');
        avatarRow.className = 'menu-profile-avatar-row';

        const leftArrow = document.createElement('button');
        leftArrow.type = 'button';
        leftArrow.className = 'menu-avatar-arrow';
        leftArrow.setAttribute('aria-label', 'Previous avatar');
        leftArrow.innerText = '‹';
        leftArrow.onclick = () => Profile.cycleAvatar(-1);

        const avatarStage = document.createElement('div');
        avatarStage.className = 'menu-profile-avatar-stage';
        avatarStage.style.background = `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.22), transparent 40%), ${Profile.data.colorHex}`;

        const avatarImage = document.createElement('img');
        avatarImage.className = 'menu-profile-avatar-image';
        avatarImage.src = window.getAvatarAsset(Profile.data.avatar);
        avatarImage.alt = `${Profile.getAvatarOption(Profile.data.avatar).label} avatar`;
        avatarImage.loading = 'eager';
        avatarStage.appendChild(avatarImage);

        const rightArrow = document.createElement('button');
        rightArrow.type = 'button';
        rightArrow.className = 'menu-avatar-arrow';
        rightArrow.setAttribute('aria-label', 'Next avatar');
        rightArrow.innerText = '›';
        rightArrow.onclick = () => Profile.cycleAvatar(1);

        avatarRow.appendChild(leftArrow);
        avatarRow.appendChild(avatarStage);
        avatarRow.appendChild(rightArrow);

        const nameRow = document.createElement('div');
        nameRow.className = 'menu-profile-name-row';

        const pencil = document.createElement('span');
        pencil.className = 'menu-profile-pencil';
        pencil.innerHTML = ICONS.pencil;

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = Profile.data.name;
        nameInput.maxLength = 12;
        nameInput.className = 'menu-profile-name-input';
        nameInput.placeholder = 'Enter Name';
        nameInput.onchange = (e) => {
            Profile.data.name = e.target.value.trim() || 'Player';
            Profile.save();
            Profile.renderMenuPanel();
        };

        nameRow.appendChild(pencil);
        nameRow.appendChild(nameInput);

        const colorGroup = document.createElement('div');
        colorGroup.className = 'menu-profile-colors';
        PLAYER_COLORS.forEach(c => {
            const dot = document.createElement('button');
            const isSelected = Profile.data.colorHex === c.hex;
            dot.type = 'button';
            dot.className = `menu-profile-color-dot ${isSelected ? 'is-selected' : ''}`;
            dot.style.backgroundColor = c.hex;
            dot.setAttribute('aria-label', c.name);
            dot.onclick = () => {
                Profile.data.colorHex = c.hex;
                Profile.save();
                Profile.renderMenuPanel();
            };
            colorGroup.appendChild(dot);
        });

        shell.appendChild(avatarRow);
        shell.appendChild(nameRow);
        shell.appendChild(colorGroup);
        panel.appendChild(shell);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Profile.load();
    Profile.renderMenuPanel();
});

window.Profile = Profile;
