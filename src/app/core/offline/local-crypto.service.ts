import { Injectable } from '@angular/core';

export interface SobreCifrado {
  iv: string;
  ciphertext: string;
  algoritmo: 'AES-GCM';
}

/**
 * [EXAMEN-2] Cifrado local (RNF-13).
 * PBKDF2-SHA256 deriva la clave desde el PIN; AES-GCM cifra los registros.
 * El PIN nunca se guarda: solo su hash con salt propio del dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class LocalCryptoService {
  private readonly iteraciones = 120_000;
  private readonly longitudClave = 256;

  disponible(): boolean {
    return typeof crypto !== 'undefined' && !!crypto.subtle;
  }

  generarSalt(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return this.bytesABase64(bytes);
  }

  async derivarClave(pin: string, salt: string): Promise<CryptoKey> {
    this.exigirCrypto();
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.base64ABytes(salt),
        iterations: this.iteraciones,
        hash: 'SHA-256'
      },
      material,
      { name: 'AES-GCM', length: this.longitudClave },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async cifrar(objeto: unknown, clave: CryptoKey): Promise<SobreCifrado> {
    this.exigirCrypto();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plano = new TextEncoder().encode(JSON.stringify(objeto));
    const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, plano);
    return {
      iv: this.bytesABase64(iv),
      ciphertext: this.bytesABase64(new Uint8Array(cifrado)),
      algoritmo: 'AES-GCM'
    };
  }

  async descifrar<T>(sobre: SobreCifrado, clave: CryptoKey): Promise<T> {
    this.exigirCrypto();
    const descifrado = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.base64ABytes(sobre.iv) },
      clave,
      this.base64ABytes(sobre.ciphertext)
    );
    return JSON.parse(new TextDecoder().decode(descifrado)) as T;
  }

  /** Hash del PIN con PBKDF2 y salt; se guarda en el dispositivo, no el PIN. */
  async hashPin(pin: string, salt: string): Promise<string> {
    this.exigirCrypto();
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: this.base64ABytes(salt),
        iterations: this.iteraciones,
        hash: 'SHA-256'
      },
      material,
      256
    );
    return this.bytesABase64(new Uint8Array(bits));
  }

  async verificarPin(pin: string, hash: string, salt: string): Promise<boolean> {
    const calculado = await this.hashPin(pin, salt);
    return this.comparacionSegura(calculado, hash);
  }

  private comparacionSegura(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diferencia = 0;
    for (let i = 0; i < a.length; i++) {
      diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diferencia === 0;
  }

  private exigirCrypto(): void {
    if (!this.disponible()) {
      throw new Error('WebCrypto no está disponible. El modo offline requiere HTTPS o localhost.');
    }
  }

  private bytesABase64(bytes: Uint8Array): string {
    let binario = '';
    bytes.forEach((byte) => { binario += String.fromCharCode(byte); });
    return btoa(binario);
  }

  private base64ABytes(base64: string): Uint8Array {
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  }
}
