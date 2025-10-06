// Encryption utilities
import crypto from 'crypto'

export class Encryption {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16

  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex')
  }

  static encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipher(this.ALGORITHM, key)
    cipher.setAAD(Buffer.from('fixer-game'))
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
  }

  static decrypt(encryptedData: string, key: string): string {
    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }

    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipher(this.ALGORITHM, key)
    decipher.setAAD(Buffer.from('fixer-game'))
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  static hash(text: string, salt?: string): string {
    const hash = crypto.createHash('sha256')
    if (salt) {
      hash.update(text + salt)
    } else {
      hash.update(text)
    }
    return hash.digest('hex')
  }

  static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  static verifyHash(text: string, hash: string, salt?: string): boolean {
    const computedHash = this.hash(text, salt)
    return computedHash === hash
  }
}



