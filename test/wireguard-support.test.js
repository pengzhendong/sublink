import { afterEach, describe, expect, it, vi } from 'vitest';
import yaml from 'js-yaml';
import { createApp } from '../src/app/createApp.jsx';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { ProxyParser } from '../src/parsers/ProxyParser.js';
import { convertYamlProxyToObject } from '../src/parsers/convertYamlProxyToObject.js';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { decodeBase64 } from '../src/utils.js';

const wireguardYaml = `proxies:
  - name: WARP-CF
    type: wireguard
    server: 162.159.192.254
    port: 2408
    ip: 172.16.0.2/32
    ipv6: 2606:4700:110::1/128
    private-key: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
    public-key: BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
    allowed-ips:
      - 0.0.0.0/0
      - ::/0
    mtu: 1280
    udp: true
  - name: Worker-CF
    type: vless
    server: 104.25.0.20
    port: 443
    uuid: 123e4567-e89b-42d3-a456-426614174000
    network: ws
    tls: true
    servername: edge.example.com
    ws-opts:
      path: /ws
      headers:
        Host: edge.example.com
`;

function createTestApp() {
    return createApp({
        kv: new MemoryKVAdapter(),
        assetFetcher: null,
        logger: console,
        config: { configTtlSeconds: 60, shortLinkTtlSeconds: null }
    });
}

describe('WireGuard subscription support', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('normalizes WireGuard nodes from Clash YAML', () => {
        const parsed = convertYamlProxyToObject(yaml.load(wireguardYaml).proxies[0]);

        expect(parsed).toMatchObject({
            tag: 'WARP-CF',
            type: 'wireguard',
            server: '162.159.192.254',
            server_port: 2408,
            local_address: ['172.16.0.2/32', '2606:4700:110::1/128'],
            allowed_ips: ['0.0.0.0/0', '::/0'],
            mtu: 1280,
            udp: true
        });
    });

    it('keeps WireGuard nodes in generated Clash YAML', async () => {
        const builder = new ClashConfigBuilder(wireguardYaml, 'minimal', [], null, 'zh-CN', 'mihomo');
        const output = yaml.load(await builder.build());
        const warp = output.proxies.find(proxy => proxy.name === 'WARP-CF');

        expect(warp).toMatchObject({
            type: 'wireguard',
            server: '162.159.192.254',
            port: 2408,
            ip: '172.16.0.2/32',
            ipv6: '2606:4700:110::1/128',
            'allowed-ips': ['0.0.0.0/0', '::/0'],
            mtu: 1280,
            udp: true
        });
    });

    it('parses WireGuard subscription URIs', async () => {
        const uri = 'wireguard://AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA%3D@162.159.192.254:2408/?publickey=BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB%3D&address=172.16.0.2%2F32%2C2606%3A4700%3A110%3A%3A1%2F128&allowed-ips=0.0.0.0%2F0%2C%3A%3A%2F0&mtu=1280&udp=1#WARP-CF';

        await expect(ProxyParser.parse(uri)).resolves.toMatchObject({
            tag: 'WARP-CF',
            type: 'wireguard',
            server_port: 2408,
            local_address: ['172.16.0.2/32', '2606:4700:110::1/128'],
            mtu: 1280,
            udp: true
        });
    });

    it('preserves unescaped plus signs in WireGuard public keys', async () => {
        const uri = 'wg://private-key@wg.example.com:51820?publicKey=N+K9fXobvy0=&address=10.0.0.2/32#WG';

        await expect(ProxyParser.parse(uri)).resolves.toMatchObject({
            peer_public_key: 'N+K9fXobvy0='
        });
    });

    it('turns structured WARP and VLESS subscriptions into a Shadowrocket-compatible URI list', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(wireguardYaml, {
            status: 200,
            headers: { 'content-type': 'text/yaml' }
        })));
        const app = createTestApp();
        const source = 'https://honeybee.example.com/cloudflare.yaml?token=test';

        const response = await app.request(`http://localhost/xray?config=${encodeURIComponent(source)}`, {
            headers: { 'User-Agent': 'Shadowrocket/2.2.90' }
        });
        const decoded = decodeBase64(await response.text());
        const lines = decoded.split('\n');

        expect(response.status).toBe(200);
        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatch(/^wg:\/\/162\.159\.192\.254:2408\?/);
        expect(lines[0]).toContain('publicKey=');
        expect(lines[0]).toContain('privateKey=');
        expect(lines[0]).toContain('ip=172.16.0.2%2F32%2C2606%3A4700%3A110%3A%3A1%2F128');
        expect(lines[1]).toMatch(/^vless:\/\//);
        expect(lines[1]).toContain('type=ws');
        expect(lines[1]).toContain('host=edge.example.com');
    });

    it('keeps the standard WireGuard URI for non-Shadowrocket Xray clients', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(wireguardYaml, {
            status: 200,
            headers: { 'content-type': 'text/yaml' }
        })));
        const app = createTestApp();
        const source = 'https://honeybee.example.com/cloudflare.yaml?token=test';

        const response = await app.request(`http://localhost/xray?config=${encodeURIComponent(source)}`, {
            headers: { 'User-Agent': 'v2rayN/7.0' }
        });
        const decoded = decodeBase64(await response.text());

        expect(response.status).toBe(200);
        expect(decoded.split('\n')[0]).toMatch(/^wireguard:\/\//);
    });
});
