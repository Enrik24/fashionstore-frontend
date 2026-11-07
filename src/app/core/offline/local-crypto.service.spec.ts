import { LocalCryptoService } from './local-crypto.service';

/**
 * [EXAMEN-2] Pruebas del cifrado local (RNF-13).
 * Verifica salt, hash PBKDF2 del PIN y cifrado/descifrado AES-GCM.
 */
describe('LocalCryptoService', () => {
  let servicio: LocalCryptoService;

  beforeEach(() => {
    servicio = new LocalCryptoService();
  });

  it('informa si WebCrypto está disponible', () => {
    expect(servicio.disponible()).toBeTrue();
  });

  it('genera salts aleatorios de 16 bytes en base64', () => {
    const salt1 = servicio.generarSalt();
    const salt2 = servicio.generarSalt();

    expect(atob(salt1).length).toBe(16);
    expect(atob(salt2).length).toBe(16);
    expect(salt1).not.toBe(salt2);
  });

  it('calcula un hash determinista del PIN con el mismo salt', async () => {
    const salt = servicio.generarSalt();

    const hash1 = await servicio.hashPin('135790', salt);
    const hash2 = await servicio.hashPin('135790', salt);
    const otroPin = await servicio.hashPin('246801', salt);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(otroPin);
    expect(hash1).not.toContain('135790');
    expect(atob(hash1).length).toBe(32);
  });

  it('verifica el PIN correcto y rechaza el incorrecto', async () => {
    const salt = servicio.generarSalt();
    const hash = await servicio.hashPin('135790', salt);

    expect(await servicio.verificarPin('135790', hash, salt)).toBeTrue();
    expect(await servicio.verificarPin('135791', hash, salt)).toBeFalse();
    expect(await servicio.verificarPin('135790', hash, servicio.generarSalt())).toBeFalse();
  });

  it('cifra y descifra un objeto con AES-GCM', async () => {
    const salt = servicio.generarSalt();
    const clave = await servicio.derivarClave('135790', salt);
    const original = { token_offline: 'tok-123', tenant_id: 10, roles: ['Cajero'] };

    const sobre = await servicio.cifrar(original, clave);
    const recuperado = await servicio.descifrar<typeof original>(sobre, clave);

    expect(sobre.algoritmo).toBe('AES-GCM');
    expect(sobre.iv.length).toBeGreaterThan(0);
    expect(sobre.ciphertext).not.toContain('tok-123');
    expect(recuperado).toEqual(original);
  });

  it('genera un IV distinto en cada cifrado', async () => {
    const salt = servicio.generarSalt();
    const clave = await servicio.derivarClave('135790', salt);

    const primero = await servicio.cifrar({ dato: 'mismo contenido' }, clave);
    const segundo = await servicio.cifrar({ dato: 'mismo contenido' }, clave);

    expect(primero.iv).not.toBe(segundo.iv);
    expect(primero.ciphertext).not.toBe(segundo.ciphertext);
  });

  it('no puede descifrar con una clave derivada de otro PIN', async () => {
    const salt = servicio.generarSalt();
    const claveCorrecta = await servicio.derivarClave('135790', salt);
    const claveIncorrecta = await servicio.derivarClave('999999', salt);
    const sobre = await servicio.cifrar({ token_offline: 'tok-123' }, claveCorrecta);

    let fallo = false;
    try {
      await servicio.descifrar(sobre, claveIncorrecta);
    } catch {
      fallo = true;
    }

    expect(fallo).toBeTrue();
  });
});
