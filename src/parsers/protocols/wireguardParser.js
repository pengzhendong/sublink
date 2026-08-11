import { parseBool } from '../../utils.js';

const DEFAULT_WIREGUARD_PORT = 51820;

export function parseWireguard(url) {
    const normalizedUrl = url.replace(/^wg:\/\//i, 'wireguard://');
    const parsed = new URL(normalizedUrl);
    const params = parsed.searchParams;
    const addresses = parseAddresses(
        params.get('address') ?? params.get('ip') ?? params.get('local_address')
    );

    return {
        tag: decodeFragment(parsed.hash),
        type: 'wireguard',
        server: parsed.hostname,
        server_port: parsed.port ? Number(parsed.port) : DEFAULT_WIREGUARD_PORT,
        private_key: firstPresent(
            normalizeKey(params.get('privatekey')),
            normalizeKey(params.get('privateKey')),
            normalizeKey(params.get('private-key')),
            parsed.username ? decodeURIComponent(parsed.username) : undefined
        ),
        peer_public_key: firstPresent(
            normalizeKey(params.get('publickey')),
            normalizeKey(params.get('publicKey')),
            normalizeKey(params.get('public-key'))
        ),
        pre_shared_key: firstPresent(
            normalizeKey(params.get('presharedkey')),
            normalizeKey(params.get('preSharedKey')),
            normalizeKey(params.get('pre-shared-key'))
        ),
        local_address: addresses,
        allowed_ips: splitList(params.get('allowed-ips') ?? params.get('allowed_ips')),
        reserved: parseReserved(params.get('reserved')),
        mtu: parseOptionalNumber(params.get('mtu')),
        udp: parseBool(params.get('udp'), true),
        persistent_keepalive: parseOptionalNumber(
            params.get('persistent-keepalive') ?? params.get('keepalive')
        )
    };
}

function decodeFragment(hash) {
    if (!hash) return 'WireGuard';
    try {
        return decodeURIComponent(hash.slice(1)) || 'WireGuard';
    } catch {
        return hash.slice(1) || 'WireGuard';
    }
}

function parseAddresses(value) {
    return splitList(value).map(address => {
        const unwrapped = address.replace(/^\[([^\]]+)](\/\d+)?$/, '$1$2');
        if (unwrapped.includes('/')) return unwrapped;
        return `${unwrapped}/${unwrapped.includes(':') ? 128 : 32}`;
    });
}

function splitList(value) {
    if (!value) return [];
    return String(value).split(',').map(item => item.trim()).filter(Boolean);
}

function parseReserved(value) {
    if (!value) return undefined;
    const bytes = splitList(value).map(Number);
    return bytes.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)
        ? bytes
        : undefined;
}

function parseOptionalNumber(value) {
    if (value === undefined || value === null || value === '') return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}

function firstPresent(...values) {
    return values.find(value => value !== undefined && value !== null && value !== '');
}

function normalizeKey(value) {
    return typeof value === 'string' ? value.replace(/ /g, '+') : value;
}
