export function convertProxyToUri(proxy) {
    switch (proxy?.type) {
        case 'vless':
            return buildVlessUri(proxy);
        case 'wireguard':
            return buildWireguardUri(proxy);
        default:
            return null;
    }
}

function buildVlessUri(proxy) {
    if (!proxy.uuid || !proxy.server || !proxy.server_port) return null;

    const params = new URLSearchParams();
    params.set('encryption', 'none');

    if (proxy.tls?.reality?.enabled) {
        params.set('security', 'reality');
        setParam(params, 'pbk', proxy.tls.reality.public_key);
        setParam(params, 'sid', proxy.tls.reality.short_id);
    } else {
        params.set('security', proxy.tls?.enabled ? 'tls' : 'none');
    }

    setParam(params, 'sni', proxy.tls?.server_name);
    setParam(params, 'fp', proxy.tls?.utls?.fingerprint);
    setParam(params, 'flow', proxy.flow);
    if (proxy.tls?.insecure) params.set('allowInsecure', '1');
    if (proxy.udp !== undefined) params.set('udp', proxy.udp ? '1' : '0');

    const transport = proxy.transport;
    params.set('type', transport?.type || 'tcp');
    if (transport?.type === 'ws') {
        setParam(params, 'path', transport.path);
        setParam(params, 'host', transport.headers?.host ?? transport.headers?.Host);
    } else if (transport?.type === 'grpc') {
        setParam(params, 'serviceName', transport.service_name);
    }

    return `vless://${encodeURIComponent(proxy.uuid)}@${formatHost(proxy.server)}:${proxy.server_port}?${params.toString()}#${encodeURIComponent(proxy.tag || 'VLESS')}`;
}

function buildWireguardUri(proxy) {
    if (!proxy.private_key || !proxy.peer_public_key || !proxy.server || !proxy.server_port) return null;

    const params = new URLSearchParams();
    params.set('publickey', proxy.peer_public_key);
    if (Array.isArray(proxy.local_address) && proxy.local_address.length > 0) {
        params.set('address', proxy.local_address.join(','));
    }
    if (Array.isArray(proxy.allowed_ips) && proxy.allowed_ips.length > 0) {
        params.set('allowed-ips', proxy.allowed_ips.join(','));
    }
    if (proxy.pre_shared_key) params.set('presharedkey', proxy.pre_shared_key);
    if (Array.isArray(proxy.reserved)) params.set('reserved', proxy.reserved.join(','));
    if (proxy.mtu !== undefined) params.set('mtu', String(proxy.mtu));
    if (proxy.persistent_keepalive !== undefined) {
        params.set('persistent-keepalive', String(proxy.persistent_keepalive));
    }
    params.set('udp', proxy.udp === false ? '0' : '1');

    return `wireguard://${encodeURIComponent(proxy.private_key)}@${formatHost(proxy.server)}:${proxy.server_port}/?${params.toString()}#${encodeURIComponent(proxy.tag || 'WireGuard')}`;
}

function formatHost(host) {
    return String(host).includes(':') ? `[${host}]` : host;
}

function setParam(params, key, value) {
    if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
    }
}
