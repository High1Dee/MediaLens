/**
 * MediaLens - Main JavaScript File
 * Handles link processing, embed generation, and UI interactions
 */

// DOM Elements
const mediaUrlInput = document.getElementById('mediaUrl');
const previewBtn = document.getElementById('previewBtn');
const previewArea = document.getElementById('previewArea');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const previewContent = document.getElementById('previewContent');
const embedPlayer = document.getElementById('embedPlayer');
const contentTitle = document.getElementById('contentTitle');
const contentAuthor = document.getElementById('contentAuthor');
const contentMetadata = document.getElementById('contentMetadata');
const platformIcon = document.getElementById('platformIcon');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const newPreviewBtn = document.getElementById('newPreviewBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');

// Toast Elements
const successToast = new bootstrap.Toast(document.getElementById('successToast'));
const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));
const copyToast = new bootstrap.Toast(document.getElementById('copyToast'));

// Platform Configuration
const PLATFORMS = {
    youtube: {
        name: 'YouTube',
        icon: 'fab fa-youtube',
        color: 'youtube-color',
        oembed: 'https://www.youtube.com/oembed',
        urlPatterns: [
            /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/|playlist\?|channel\/|c\/|user\/)?([a-zA-Z0-9_-]+)/i
        ],
        getEmbedUrl: (url) => {
            if (url.includes('youtu.be/')) {
                const videoId = url.split('youtu.be/')[1].split('?')[0];
                return `https://www.youtube.com/embed/${videoId}`;
            } else if (url.includes('youtube.com/shorts/')) {
                const videoId = url.split('shorts/')[1].split('?')[0];
                return `https://www.youtube.com/embed/${videoId}`;
            } else if (url.includes('v=')) {
                const videoId = url.split('v=')[1].split('&')[0];
                return `https://www.youtube.com/embed/${videoId}`;
            }
            return url;
        }
    },
    instagram: {
        name: 'Instagram',
        icon: 'fab fa-instagram',
        color: 'instagram-color',
        oembed: 'https://api.instagram.com/oembed',
        urlPatterns: [
            /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i
        ],
        getEmbedUrl: (url) => {
            // Instagram requires special handling - we'll use their embed API
            return url;
        }
    },
    facebook: {
        name: 'Facebook',
        icon: 'fab fa-facebook',
        color: 'facebook-color',
        oembed: 'https://www.facebook.com/plugins/video/oembed.json',
        urlPatterns: [
            /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:[^\/]+\/)?(?:videos|watch|reel)\/(?:[0-9]+)/i,
            /(?:https?:\/\/)?(?:www\.)?fb\.watch\/([a-zA-Z0-9_-]+)/i
        ],
        getEmbedUrl: (url) => {
            // Facebook embed requires specific URL format
            if (url.includes('fb.watch/')) {
                return url;
            }
            return url.replace('www.facebook.com', 'www.facebook.com/plugins/video.php');
        }
    },
    tiktok: {
        name: 'TikTok',
        icon: 'fab fa-tiktok',
        color: 'tiktok-color',
        oembed: 'https://www.tiktok.com/oembed',
        urlPatterns: [
            /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^\/]+\/video\/([0-9]+)/i,
            /(?:https?:\/\/)?(?:vm\.)?tiktok\.com\/([a-zA-Z0-9]+)/i
        ],
        getEmbedUrl: (url) => {
            return url;
        }
    },
    audiomack: {
        name: 'Audiomack',
        icon: 'fas fa-music',
        color: 'audiomack-color',
        oembed: 'https://audiomack.com/oembed',
        urlPatterns: [
            /(?:https?:\/\/)?(?:www\.)?audiomack\.com\/(?:[^\/]+\/)?(?:song|album|playlist)\/(?:[^\/]+)/i
        ],
        getEmbedUrl: (url) => {
            return url;
        }
    }
};

/**
 * Detect platform from URL
 * @param {string} url - The URL to analyze
 * @returns {Object|null} Platform configuration or null if not found
 */
function detectPlatform(url) {
    for (const [platformId, platform] of Object.entries(PLATFORMS)) {
        for (const pattern of platform.urlPatterns) {
            if (pattern.test(url)) {
                return { id: platformId, ...platform };
            }
        }
    }
    return null;
}

/**
 * Extract video/audio ID from URL based on platform
 * @param {string} url - The URL
 * @param {Object} platform - Platform configuration
 * @returns {string|null} Extracted ID or null
 */
function extractMediaId(url, platform) {
    switch (platform.id) {
        case 'youtube':
            if (url.includes('youtu.be/')) {
                return url.split('youtu.be/')[1].split('?')[0];
            } else if (url.includes('v=')) {
                return url.split('v=')[1].split('&')[0];
            } else if (url.includes('youtube.com/shorts/')) {
                return url.split('shorts/')[1].split('?')[0];
            }
            break;
            
        case 'instagram':
            const instaMatch = url.match(/\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/);
            return instaMatch ? instaMatch[2] : null;
            
        case 'facebook':
            const fbMatch = url.match(/\/(videos|watch|reel)\/(\d+)/);
            return fbMatch ? fbMatch[2] : null;
            
        case 'tiktok':
            const tiktokMatch = url.match(/video\/(\d+)/) || url.match(/tiktok\.com\/([^\/?]+)/);
            return tiktokMatch ? tiktokMatch[1] : null;
            
        case 'audiomack':
            // Return the full URL for Audiomack as it's needed for oembed
            return url;
    }
    return null;
}

/**
 * Show loading state
 */
function showLoading() {
    loadingState.classList.remove('d-none');
    errorState.classList.add('d-none');
    previewContent.classList.add('d-none');
    previewArea.classList.remove('d-none');
}

/**
 * Show error state
 * @param {string} message - Error message to display
 */
function showError(message) {
    loadingState.classList.add('d-none');
    previewContent.classList.add('d-none');
    errorState.classList.remove('d-none');
    errorMessage.textContent = message;
    previewArea.classList.remove('d-none');
    
    // Show error toast
    document.getElementById('errorToastMessage').textContent = message;
    errorToast.show();
}

/**
 * Show preview content
 */
function showPreview() {
    loadingState.classList.add('d-none');
    errorState.classList.add('d-none');
    previewContent.classList.remove('d-none');
    previewContent.classList.add('fade-in');
}

/**
 * Create platform icon element
 * @param {Object} platform - Platform configuration
 * @returns {HTMLElement} Icon element
 */
function createPlatformIcon(platform) {
    const icon = document.createElement('i');
    icon.className = `${platform.icon} ${platform.color} fa-2x`;
    return icon;
}

/**
 * Fetch oEmbed data
 * @param {string} url - URL to fetch oEmbed for
 * @param {Object} platform - Platform configuration
 * @returns {Promise<Object>} oEmbed response data
 */
async function fetchOEmbed(url, platform) {
    try {
        const oembedUrl = `${platform.oembed}?url=${encodeURIComponent(url)}&format=json`;
        const response = await fetch(oembedUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.warn(`Failed to fetch oEmbed for ${platform.name}:`, error);
        return null;
    }
}

/**
 * Create embed HTML based on platform
 * @param {string} url - Original URL
 * @param {Object} platform - Platform configuration
 * @param {Object|null} oembedData - oEmbed response data
 * @returns {string} HTML string for embed
 */
function createEmbedHTML(url, platform, oembedData) {
    if (oembedData && oembedData.html) {
        return oembedData.html;
    }
    
    // Fallback embeds if oEmbed fails
    switch (platform.id) {
        case 'youtube':
            const videoId = extractMediaId(url, platform);
            if (videoId) {
                return `<iframe 
                    src="https://www.youtube.com/embed/${videoId}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>`;
            }
            break;
            
        case 'facebook':
            return `<iframe 
                src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}" 
                frameborder="0" 
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" 
                allowfullscreen>
            </iframe>`;
            
        case 'instagram':
            return `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"></blockquote>`;
            
        case 'tiktok':
            return `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${extractMediaId(url, platform)}"></blockquote>`;
            
        case 'audiomack':
            return `<iframe 
                src="${url}/embed" 
                scrolling="no" 
                frameborder="0">
            </iframe>`;
    }
    
    return `<div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Direct embed not available. <a href="${url}" target="_blank" rel="noopener">View on ${platform.name}</a>
            </div>`;
}

/**
 * Format metadata for display
 * @param {Object} oembedData - oEmbed response data
 * @param {Object} platform - Platform configuration
 * @returns {string} HTML string for metadata
 */
function formatMetadata(oembedData, platform) {
    if (!oembedData) {
        return `<p class="text-muted small mb-0">No additional metadata available.</p>`;
    }
    
    let html = '';
    
    if (oembedData.title) {
        html += `<p class="mb-2"><strong>Title:</strong> ${oembedData.title}</p>`;
    }
    
    if (oembedData.author_name) {
        html += `<p class="mb-2"><strong>Author:</strong> ${oembedData.author_name}</p>`;
    }
    
    if (oembedData.provider_name) {
        html += `<p class="mb-2"><strong>Platform:</strong> ${oembedData.provider_name}</p>`;
    }
    
    if (oembedData.width && oembedData.height) {
        html += `<p class="mb-2"><strong>Dimensions:</strong> ${oembedData.width} × ${oembedData.height}</p>`;
    }
    
    if (oembedData.thumbnail_url) {
        html += `<p class="mb-0"><strong>Thumbnail:</strong> Available</p>`;
    }
    
    return html;
}

/**
 * Handle preview button click
 */
async function handlePreview() {
    const url = mediaUrlInput.value.trim();
    
    // Validate URL
    if (!url) {
        showError('Please enter a URL to preview.');
        mediaUrlInput.focus();
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError('Please enter a valid URL starting with http:// or https://');
        mediaUrlInput.focus();
        return;
    }
    
    // Detect platform
    const platform = detectPlatform(url);
    if (!platform) {
        showError('Unsupported platform. Please use YouTube, Instagram, Facebook, TikTok, or Audiomack links.');
        return;
    }
    
    // Show loading state
    showLoading();
    
    try {
        // Fetch oEmbed data
        const oembedData = await fetchOEmbed(url, platform);
        
        // Create embed HTML
        const embedHTML = createEmbedHTML(url, platform, oembedData);
        
        // Update UI
        embedPlayer.innerHTML = embedHTML;
        
        // Set platform icon
        platformIcon.innerHTML = '';
        platformIcon.appendChild(createPlatformIcon(platform));
        
        // Set content info
        if (oembedData) {
            contentTitle.textContent = oembedData.title || `Content from ${platform.name}`;
            contentAuthor.textContent = oembedData.author_name 
                ? `By ${oembedData.author_name}` 
                : platform.name;
        } else {
            contentTitle.textContent = `Content from ${platform.name}`;
            contentAuthor.textContent = platform.name;
        }
        
        // Set metadata
        contentMetadata.innerHTML = formatMetadata(oembedData, platform);
        
        // Load platform-specific scripts if needed
        loadPlatformScripts(platform.id);
        
        // Show preview
        showPreview();
        
        // Show success toast
        successToast.show();
        
    } catch (error) {
        console.error('Error processing preview:', error);
        showError(`Unable to preview content. Please check the link and try again. Error: ${error.message}`);
    }
}

/**
 * Load platform-specific embed scripts
 * @param {string} platformId - Platform identifier
 */
function loadPlatformScripts(platformId) {
    // Remove existing platform scripts
    document.querySelectorAll('.platform-script').forEach(script => script.remove());
    
    switch (platformId) {
        case 'instagram':
            const instagramScript = document.createElement('script');
            instagramScript.src = 'https://www.instagram.com/embed.js';
            instagramScript.async = true;
            instagramScript.defer = true;
            instagramScript.className = 'platform-script';
            document.body.appendChild(instagramScript);
            break;
            
        case 'tiktok':
            const tiktokScript = document.createElement('script');
            tiktokScript.src = 'https://www.tiktok.com/embed.js';
            tiktokScript.async = true;
            tiktokScript.defer = true;
            tiktokScript.className = 'platform-script';
            document.body.appendChild(tiktokScript);
            break;
    }
}

/**
 * Copy current URL to clipboard
 */
function copyCurrentUrl() {
    const url = mediaUrlInput.value.trim();
    if (!url) return;
    
    navigator.clipboard.writeText(url).then(() => {
        copyToast.show();
    }).catch(err => {
        console.error('Failed to copy URL:', err);
    });
}

/**
 * Reset preview and start new
 */
function startNewPreview() {
    previewArea.classList.add('d-none');
    mediaUrlInput.value = '';
    mediaUrlInput.focus();
}

/**
 * Initialize the application
 */
function init() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Event Listeners
    if (previewBtn) {
        previewBtn.addEventListener('click', handlePreview);
    }
    
    if (mediaUrlInput) {
        mediaUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handlePreview();
            }
        });
    }
    
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyCurrentUrl);
    }
    
    if (newPreviewBtn) {
        newPreviewBtn.addEventListener('click', startNewPreview);
    }
    
    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', startNewPreview);
    }
    
    // Example URLs for testing (would be removed in production)
    const exampleUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.instagram.com/p/Cexample/',
        'https://www.tiktok.com/@user/video/123456789',
        'https://www.facebook.com/watch/?v=123456789',
        'https://audiomack.com/artist/song-example'
    ];
    
    // For demo purposes: pre-fill with a random example URL
    if (mediaUrlInput && mediaUrlInput.value === '') {
        const randomUrl = exampleUrls[Math.floor(Math.random() * exampleUrls.length)];
        mediaUrlInput.placeholder = randomUrl;
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectPlatform,
        extractMediaId,
        fetchOEmbed,
        createEmbedHTML
    };
}