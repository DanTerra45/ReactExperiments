import { ExternalLink, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn.js';

const PROVIDERS = {
  youtube: {
    label: 'YouTube',
    summary: 'Iframe · controles parciales',
    blocked: 'título, canal/avatar y branding',
    aspect: 'aspect-video',
    api_available: false,
    embed_options: [
      { key: 'controls', label: 'Ocultar controles' },
      { key: 'fullscreen', label: 'Ocultar fullscreen' },
    ],
  },
  tiktok: {
    label: 'TikTok',
    summary: 'Player v1 + Display API',
    blocked: 'creador / atribución',
    aspect: 'aspect-9/16',
    api_available: true,
    api_label: 'Display API',
    embed_options: [
      { key: 'description', label: 'Ocultar descripción' },
      { key: 'music_info', label: 'Ocultar música' },
      { key: 'progress_bar', label: 'Ocultar progreso' },
      { key: 'play_button', label: 'Ocultar play' },
      { key: 'volume_control', label: 'Ocultar volumen' },
      { key: 'fullscreen_button', label: 'Ocultar fullscreen' },
      { key: 'timestamp', label: 'Ocultar tiempo' },
      { key: 'closed_caption', label: 'Ocultar CC' },
      { key: 'controls', label: 'Ocultar todos los controles' },
    ],
    api_options: [],
  },
  instagram: {
    label: 'Instagram',
    summary: 'Embed + API media_url',
    blocked: 'usuario/avatar y branding del embed',
    aspect: 'aspect-9/16',
    api_available: true,
    api_label: 'API / media_url',
    embed_options: [{ key: 'caption', label: 'Ocultar caption' }],
    api_options: [],
  },
  facebook: {
    label: 'Facebook',
    summary: 'Embed + Graph API source',
    blocked: 'título, página/autor y branding',
    aspect: 'aspect-video',
    api_available: true,
    api_label: 'Graph API / source',
    embed_options: [{ key: 'post_text', label: 'Ocultar texto del post' }],
    api_options: [],
  },
  x: {
    label: 'X / Twitter',
    summary: 'Post embed + X API media',
    blocked: 'autor, texto y branding del post',
    aspect: null,
    api_available: true,
    api_label: 'X API / media',
    embed_options: [{ key: 'conversation', label: 'Ocultar post padre' }],
    api_options: [],
  },
};

const DEFAULT_OPTIONS = {
  youtube: {
    controls: false,
    fullscreen: false,
  },
  tiktok: {
    description: true,
    music_info: true,
    progress_bar: false,
    play_button: false,
    volume_control: false,
    fullscreen_button: false,
    timestamp: false,
    closed_caption: false,
    controls: false,
  },
  instagram: {
    caption: true,
  },
  facebook: {
    post_text: true,
  },
  x: {
    conversation: true,
  },
};

const TIKTOK_CONTROL_OPTIONS = new Set([
  'progress_bar',
  'play_button',
  'volume_control',
  'fullscreen_button',
  'closed_caption',
]);

const SAMPLES = {
  youtube: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
  tiktok: 'https://www.tiktok.com/@scout2015/video/6718335390845095173',
  instagram: 'https://www.instagram.com/reel/DLHx_WNoXoY/',
  facebook: 'https://www.facebook.com/facebook/videos/10153231379946729/',
  x: 'https://x.com/SpaceX/status/2049581577844199476',
};

function detect_provider(value) {
  const input = value.toLowerCase();

  if (input.includes('youtu.be') || input.includes('youtube.com')) return 'youtube';
  if (input.includes('tiktok.com')) return 'tiktok';
  if (input.includes('instagram.com')) return 'instagram';
  if (input.includes('facebook.com') || input.includes('fb.watch')) return 'facebook';
  if (input.includes('x.com') || input.includes('twitter.com')) return 'x';

  return null;
}

function parse_youtube_id(value) {
  try {
    const url = new URL(value);

    if (url.hostname === 'youtu.be') {
      return url.pathname.split('/').filter(Boolean)[0] ?? '';
    }

    if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/')) {
      return url.pathname.split('/').filter(Boolean)[1] ?? '';
    }

    return url.searchParams.get('v') ?? '';
  } catch {
    return '';
  }
}

function parse_tiktok_id(value) {
  const match = value.match(/(?:\/video\/|\/player\/v1\/)(\d+)/);
  return match?.[1] ?? '';
}

function parse_instagram_media(value) {
  const match = value.match(/instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (!match) return null;

  return {
    kind: match[1].toLowerCase() === 'reels' ? 'reel' : match[1].toLowerCase(),
    shortcode: match[2],
  };
}

function parse_x_post_id(value) {
  const match = value.match(/(?:x\.com|twitter\.com)\/(?:i\/status|[^/]+\/status)\/(\d+)/i);
  return match?.[1] ?? '';
}

function normalize_facebook_url(value) {
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith('facebook.com')) return '';

    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function visibility_param(hidden) {
  return hidden ? '0' : '1';
}

function build_public_embed(provider, source_url, options) {
  if (provider === 'youtube') {
    const id = parse_youtube_id(source_url);
    if (!id) return '';

    const params = new URLSearchParams({
      controls: visibility_param(options.controls),
      fs: visibility_param(options.fullscreen),
      playsinline: '1',
      rel: '0',
    });

    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`;
  }

  if (provider === 'tiktok') {
    const id = parse_tiktok_id(source_url);
    if (!id) return '';

    const params = new URLSearchParams({
      controls: visibility_param(options.controls),
      progress_bar: visibility_param(options.progress_bar),
      play_button: visibility_param(options.play_button),
      volume_control: visibility_param(options.volume_control),
      fullscreen_button: visibility_param(options.fullscreen_button),
      timestamp: visibility_param(options.timestamp),
      music_info: visibility_param(options.music_info),
      description: visibility_param(options.description),
      closed_caption: visibility_param(options.closed_caption),
      rel: '0',
      native_context_menu: '1',
    });

    return `https://www.tiktok.com/player/v1/${encodeURIComponent(id)}?${params}`;
  }

  if (provider === 'instagram') {
    const media = parse_instagram_media(source_url);
    if (!media) return '';

    const suffix = options.caption ? 'embed/' : 'embed/captioned/';
    return `https://www.instagram.com/${media.kind}/${encodeURIComponent(media.shortcode)}/${suffix}`;
  }

  if (provider === 'facebook') {
    const normalized_url = normalize_facebook_url(source_url);
    if (!normalized_url) return '';

    const params = new URLSearchParams({
      href: normalized_url,
      show_text: options.post_text ? 'false' : 'true',
      width: '560',
    });

    return `https://www.facebook.com/plugins/video.php?${params}`;
  }

  return '';
}

function build_api_embed(provider, source_url, options) {
  if (provider !== 'tiktok') return '';

  const id = parse_tiktok_id(source_url);
  if (!id) return '';

  const params = new URLSearchParams({
    id,
    // TikTok includes this in the embed_link examples returned by Display API.
    // It is not documented as a complete creator-identity toggle.
    hide_author: '1',
  });

  return `https://www.tiktok.com/static/profile-video?${params}`;
}

function load_x_widgets() {
  return new Promise((resolve, reject) => {
    if (window.twttr?.widgets?.createTweet) {
      resolve(window.twttr);
      return;
    }

    let script = document.getElementById('x-wjs');

    const handle_ready = () => {
      if (window.twttr?.widgets?.createTweet) {
        resolve(window.twttr);
      } else {
        reject(new Error('X widgets.js did not initialize.'));
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = 'x-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      document.head.appendChild(script);
    }

    script.addEventListener('load', handle_ready, { once: true });
    script.addEventListener('error', () => reject(new Error('Could not load X widgets.js.')), {
      once: true,
    });

    if (window.twttr?.widgets?.createTweet) {
      handle_ready();
    }
  });
}

function XPostEmbed({ source_url, hide_conversation }) {
  const container_ref = useRef(null);
  const [error, set_error] = useState('');

  useEffect(() => {
    let is_cancelled = false;
    const container = container_ref.current;
    const post_id = parse_x_post_id(source_url);

    if (!container) return undefined;

    container.replaceChildren();
    set_error('');

    if (!post_id) {
      set_error('URL de post de X no válida.');
      return undefined;
    }

    async function render_post() {
      try {
        const twttr = await load_x_widgets();
        if (is_cancelled || !container_ref.current) return;

        const element = await twttr.widgets.createTweet(post_id, container_ref.current, {
          align: 'center',
          cards: 'visible',
          conversation: hide_conversation ? 'none' : 'all',
          dnt: true,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        });

        if (!element && !is_cancelled) {
          set_error('X no pudo renderizar este post.');
        }
      } catch {
        if (!is_cancelled) {
          set_error('No se pudo cargar el embed de X.');
        }
      }
    }

    render_post();

    return () => {
      is_cancelled = true;
      container.replaceChildren();
    };
  }, [source_url, hide_conversation]);

  return (
    <div className="min-h-40">
      <div ref={container_ref} />
      {error ? <p className="py-8 text-center text-sm text-zinc-400">{error}</p> : null}
    </div>
  );
}

function default_cover_url(provider, source_url) {
  if (provider !== 'youtube') return '';

  const id = parse_youtube_id(source_url);
  return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : '';
}

function is_option_disabled(provider, option_key, options) {
  if (!options.controls) return false;

  if (provider === 'youtube' && option_key === 'fullscreen') {
    return true;
  }

  return provider === 'tiktok' && TIKTOK_CONTROL_OPTIONS.has(option_key);
}

function MethodButton({ active, disabled, children, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950'
          : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function VideoEmbeds() {
  const [provider, set_provider] = useState('youtube');
  const [source_url, set_source_url] = useState(SAMPLES.youtube);
  const [method, set_method] = useState('embed');
  const [ours_started, set_ours_started] = useState(false);
  const [ours_presentation, set_ours_presentation] = useState('inline');
  const [ours_modal_open, set_ours_modal_open] = useState(false);
  const [provider_options, set_provider_options] = useState(DEFAULT_OPTIONS);
  const [api_urls, set_api_urls] = useState({
    instagram: '',
    facebook: '',
    x: '',
  });
  const [cover_urls, set_cover_urls] = useState({
    youtube: '',
    tiktok: '',
    instagram: '',
    facebook: '',
    x: '',
  });

  const active_provider = PROVIDERS[provider];
  const active_options = provider_options[provider];
  const active_option_list =
    method === 'embed'
      ? active_provider.embed_options
      : method === 'api'
        ? active_provider.api_options ?? []
        : [];

  const player_url = useMemo(() => {
    if (method === 'api') {
      return build_api_embed(provider, source_url, active_options);
    }

    return build_public_embed(provider, source_url, active_options);
  }, [provider, source_url, method, active_options]);

  const custom_media_url = method === 'api' && ['instagram', 'facebook', 'x'].includes(provider)
    ? api_urls[provider]
    : '';
  const cover_url = cover_urls[provider] || default_cover_url(provider, source_url);
  const ours_inline_started = method === 'ours' && ours_presentation === 'inline' && ours_started;

  useEffect(() => {
    if (!ours_modal_open) return undefined;

    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handle_keydown(event) {
      if (event.key === 'Escape') {
        set_ours_modal_open(false);
      }
    }

    window.addEventListener('keydown', handle_keydown);

    return () => {
      document.body.style.overflow = previous_overflow;
      window.removeEventListener('keydown', handle_keydown);
    };
  }, [ours_modal_open]);

  function choose_provider(next_provider) {
    set_provider(next_provider);
    set_source_url(SAMPLES[next_provider]);
    set_ours_started(false);
    set_ours_modal_open(false);

    if (method === 'api' && !PROVIDERS[next_provider].api_available) {
      set_method('embed');
    }
  }

  function choose_random_sample() {
    const providers = Object.keys(PROVIDERS).filter((value) => value !== provider);
    const next_provider =
      providers[crypto.getRandomValues(new Uint32Array(1))[0] % providers.length];

    choose_provider(next_provider);
  }

  function handle_source_change(event) {
    const next_url = event.target.value;
    const detected_provider = detect_provider(next_url);

    set_source_url(next_url);
    set_ours_started(false);
    set_ours_modal_open(false);

    if (detected_provider && detected_provider !== provider) {
      set_provider(detected_provider);

      if (!PROVIDERS[detected_provider].api_available) {
        set_method('embed');
      }
    }
  }

  function toggle_option(key) {
    set_provider_options((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        [key]: !current[provider][key],
      },
    }));
  }

  function select_method(next_method) {
    if (next_method === 'api' && !active_provider.api_available) return;
    set_method(next_method);
    set_ours_started(false);
    set_ours_modal_open(false);
  }

  const can_render_iframe = Boolean(player_url);
  const can_render_video = Boolean(custom_media_url);
  const has_preview = can_render_iframe || can_render_video;

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
        <section aria-label="Video providers">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none hover:border-zinc-400 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white dark:focus-visible:ring-offset-zinc-950"
              onClick={choose_random_sample}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Random demo
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(PROVIDERS).map(([value, item]) => {
              const is_active = provider === value;

              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={is_active}
                  className={cn(
                    'rounded-xl border p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950',
                    is_active
                      ? 'border-blue-600 bg-blue-50 text-zinc-950 ring-1 ring-blue-600 dark:border-blue-500 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-blue-500'
                      : 'border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700',
                  )}
                  onClick={() => choose_provider(value)}
                >
                  <span className="block font-semibold">{item.label}</span>
                  <span
                    className={cn(
                      'mt-2 block text-pretty text-sm leading-5',
                      is_active
                        ? 'text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-500 dark:text-zinc-400',
                    )}
                  >
                    {item.summary}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-5">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <MethodButton active={method === 'embed'} onClick={() => select_method('embed')}>
                Embed público
              </MethodButton>
              <MethodButton
                active={method === 'api'}
                disabled={!active_provider.api_available}
                onClick={() => select_method('api')}
              >
                {active_provider.api_label ?? 'API'}
              </MethodButton>
              <MethodButton active={method === 'ours'} onClick={() => select_method('ours')}>
                Ours
              </MethodButton>
            </div>

            <div>
              <label htmlFor="video-source" className="text-sm font-medium">
                Video URL
              </label>
              <input
                id="video-source"
                type="url"
                value={source_url}
                onChange={handle_source_change}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="YouTube, TikTok, Instagram, Facebook o X"
              />
            </div>

            {method === 'ours' ? (
              <div>
                <label htmlFor="cover-url" className="text-sm font-medium">
                  Portada propia (opcional)
                </label>
                <input
                  id="cover-url"
                  type="url"
                  value={cover_urls[provider]}
                  onChange={(event) => {
                    set_cover_urls((current) => ({
                      ...current,
                      [provider]: event.target.value,
                    }));
                    set_ours_started(false);
                  }}
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder={provider === 'youtube' ? 'Automática si se deja vacío' : 'https://.../cover.jpg'}
                />
                <div className="mt-3 inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
                  <button
                    type="button"
                    aria-pressed={ours_presentation === 'inline'}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium',
                      ours_presentation === 'inline'
                        ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                        : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
                    )}
                    onClick={() => {
                      set_ours_presentation('inline');
                      set_ours_started(false);
                      set_ours_modal_open(false);
                    }}
                  >
                    Inline
                  </button>
                  <button
                    type="button"
                    aria-pressed={ours_presentation === 'modal'}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium',
                      ours_presentation === 'modal'
                        ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                        : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
                    )}
                    onClick={() => {
                      set_ours_presentation('modal');
                      set_ours_started(false);
                      set_ours_modal_open(false);
                    }}
                  >
                    Modal
                  </button>
                </div>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Antes del click no cargamos el embed ni mostramos metadata social.
                </p>
              </div>
            ) : null}

            {method === 'api' && provider === 'tiktok' ? (
              <div className="space-y-2">
                <label htmlFor="tiktok-display-link" className="text-sm font-medium">
                  Display API link
                </label>
                <input
                  id="tiktok-display-link"
                  type="url"
                  value={player_url}
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2.5 font-mono text-xs text-zinc-700 outline-none selection:bg-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:selection:bg-blue-900"
                />
                <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Experimental: lo derivamos del ID público. TikTok devuelve <code>hide_author=1</code> en sus ejemplos oficiales, pero el renderer actual sigue mostrando identidad del creador.
                </p>
              </div>
            ) : null}

            {method === 'api' && provider === 'instagram' ? (
              <div>
                <label htmlFor="instagram-media-url" className="text-sm font-medium">
                  media_url autorizado
                </label>
                <input
                  id="instagram-media-url"
                  type="url"
                  value={api_urls.instagram}
                  onChange={(event) =>
                    set_api_urls((current) => ({
                      ...current,
                      instagram: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="URL del archivo devuelta por la API"
                />
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Player propio. Meta puede omitir <code>media_url</code> en video con audio licenciado/copyright y en algunos Reels con descargas desactivadas.
                </p>
              </div>
            ) : null}

            {method === 'api' && provider === 'facebook' ? (
              <div>
                <label htmlFor="facebook-source-url" className="text-sm font-medium">
                  source devuelto por Graph API
                </label>
                <input
                  id="facebook-source-url"
                  type="url"
                  value={api_urls.facebook}
                  onChange={(event) =>
                    set_api_urls((current) => ({
                      ...current,
                      facebook: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="URL reproducible devuelta en source"
                />
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Requiere un Page/User Access Token con acceso al video; <code>source</code> es el archivo reproducible.
                </p>
              </div>
            ) : null}

            {method === 'api' && provider === 'x' ? (
              <div>
                <label htmlFor="x-media-url" className="text-sm font-medium">
                  URL MP4 de media.fields=variants
                </label>
                <input
                  id="x-media-url"
                  type="url"
                  value={api_urls.x}
                  onChange={(event) =>
                    set_api_urls((current) => ({
                      ...current,
                      x: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="URL de una variante MP4 devuelta por X API"
                />
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  X API puede devolver <code>variants</code> al expandir <code>attachments.media_keys</code>. Requiere acceso a la API.
                </p>
              </div>
            ) : null}

            {active_option_list.length > 0 ? (
              <fieldset className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <legend className="px-1 text-sm font-semibold">Opciones</legend>

                <div className="grid gap-3 sm:grid-cols-2">
                  {active_option_list.map((option) => {
                    const disabled = is_option_disabled(provider, option.key, active_options);

                    return (
                      <label
                        key={option.key}
                        className={cn(
                          'flex items-center gap-2.5 text-sm',
                          disabled && 'opacity-45',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={active_options[option.key]}
                          disabled={disabled}
                          onChange={() => toggle_option(option.key)}
                          className="size-4"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>

                {method === 'embed' ? (
                  <p className="mt-4 border-t border-zinc-200 pt-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    No se puede ocultar:{' '}
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {active_provider.blocked}
                    </span>
                    .
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {!active_provider.api_available ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {provider === 'youtube'
                  ? 'La Data API entrega metadata; la reproducción sigue usando el IFrame de YouTube.'
                  : 'Aquí no tenemos una segunda ruta oficial verificada para quitar el chrome del player.'}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <h2 className="text-lg font-semibold">{active_provider.label}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {method === 'embed'
                    ? 'Embed público'
                    : method === 'api'
                      ? active_provider.api_label
                      : ours_presentation === 'modal'
                        ? 'Ours · modal'
                        : ours_started
                          ? 'Ours · embed cargado'
                          : 'Ours · portada limpia'}
                </p>
              </div>
              <a
                href={source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 outline-none hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-zinc-400 dark:hover:text-white"
              >
                Abrir original
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            </div>

            <div
              className={cn(
                'mx-auto overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800',
                provider === 'x' && (method === 'embed' || ours_inline_started)
                  ? 'w-full bg-transparent p-3'
                  : 'bg-black',
                method === 'api' && provider === 'x'
                  ? 'aspect-video'
                  : method === 'ours' && provider === 'x' && !ours_inline_started
                    ? 'aspect-video'
                    : active_provider.aspect,
                provider === 'tiktok' || provider === 'instagram' ? 'max-w-md' : 'w-full',
              )}
            >
              {method === 'ours' && !ours_inline_started ? (
                <button
                  type="button"
                  className="group relative flex size-full min-h-56 items-center justify-center overflow-hidden bg-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  onClick={() => {
                    if (ours_presentation === 'modal') {
                      set_ours_modal_open(true);
                    } else {
                      set_ours_started(true);
                    }
                  }}
                  aria-label={`Reproducir ${active_provider.label}`}
                >
                  {cover_url ? (
                    <img
                      src={cover_url}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                  <span className="absolute inset-0 bg-black/20 group-hover:bg-black/30" />
                  <span className="relative flex size-16 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-105">
                    <span
                      aria-hidden="true"
                      className="ml-1 block size-0 border-y-[11px] border-y-transparent border-l-[18px] border-l-zinc-950"
                    />
                  </span>
                </button>
              ) : provider === 'x' && (method === 'embed' || ours_inline_started) ? (
                <XPostEmbed
                  source_url={source_url}
                  hide_conversation={active_options.conversation}
                />
              ) : can_render_video ? (
                <video
                  key={custom_media_url}
                  src={custom_media_url}
                  className="size-full object-contain"
                  controls
                  playsInline
                />
              ) : can_render_iframe ? (
                <iframe
                  key={player_url}
                  src={player_url}
                  title={`${active_provider.label} ${method} video`}
                  className="size-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="flex size-full items-center justify-center p-6 text-center text-sm text-zinc-400">
                  {method === 'api' && provider === 'instagram'
                    ? 'Pega un media_url devuelto por Instagram API.'
                    : method === 'api' && provider === 'facebook'
                      ? 'Pega el source devuelto por Graph API.'
                      : method === 'api' && provider === 'x'
                        ? 'Pega una variante MP4 devuelta por X API.'
                        : 'No hay preview disponible para este método.'}
                </div>
              )}
            </div>

            {has_preview && method === 'api' && ['instagram', 'facebook', 'x'].includes(provider) ? (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Player propio: sin chrome social del embed.
              </p>
            ) : null}

            {method === 'ours' ? (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                {ours_presentation === 'modal'
                  ? 'La página queda limpia incluso durante la reproducción; el chrome social solo aparece dentro del modal.'
                  : 'La portada queda limpia; después del click el proveedor puede volver a mostrar título, autor o branding dentro de su embed.'}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {method === 'ours' && ours_presentation === 'modal' && ours_modal_open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${active_provider.label} video`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              set_ours_modal_open(false);
            }
          }}
        >
          <div className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
              <span className="text-sm font-medium text-white">{active_provider.label}</span>
              <div className="flex items-center gap-3">
                <a
                  href={source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-zinc-300 hover:text-white"
                >
                  Abrir original
                </a>
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-lg border border-white/15 text-xl leading-none text-white hover:bg-white/10"
                  onClick={() => set_ours_modal_open(false)}
                  aria-label="Cerrar video"
                >
                  ×
                </button>
              </div>
            </div>

            <div
              className={cn(
                'mx-auto w-full overflow-auto bg-black',
                provider === 'x'
                  ? 'max-h-[82dvh] max-w-3xl p-3'
                  : provider === 'tiktok' || provider === 'instagram'
                    ? 'aspect-9/16 max-h-[82dvh] max-w-md'
                    : 'aspect-video max-w-5xl',
              )}
            >
              {provider === 'x' ? (
                <XPostEmbed
                  source_url={source_url}
                  hide_conversation={active_options.conversation}
                />
              ) : player_url ? (
                <iframe
                  src={player_url}
                  title={`${active_provider.label} modal video`}
                  className="size-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="flex min-h-64 items-center justify-center p-6 text-sm text-zinc-400">
                  No hay un embed compatible para esta URL.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
