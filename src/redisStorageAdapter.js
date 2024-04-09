// Load environment variables
import Redis from 'ioredis';

export class RedisStorageAdapter {
    constructor(port, host, password) {
        this.redis = new Redis(port, host, {password: password})
    }

    getRedisKey(keyArray, asPrefix = false) {
        return keyArray.join(".") + (asPrefix ? '*' : '')
    }

    getStorageKey(key) {
        return key.split(".")
    }

    async load(keyArray) {
        console.log(`load: ${keyArray}`)

        try {
            const val = await this.redis.get(this.getRedisKey(keyArray))
            const res = val !== null ? new TextEncoder().encode(val) : undefined
            console.log(`load - res: ${res}`)
            return res
        } catch (error) {
            console.error(`error while fetching value from redis: ${error}`)
            return undefined
        }
    }

    async save(key, data) {
        console.log(`save: {${key}: ${data}}`)

        try {
            this.redis.set(this.getRedisKey(key), data)
        } catch (error) {
            console.error(`error while setting value in redis: ${error}`)
        }
    }
    
    async remove(key) {
        console.log(`remove: ${key}`)

        try {
            this.redis.del(this.getRedisKey(key))
        } catch (error) {
            console.error(`error while removing value from redis: ${error}`)
        }
    }
    
    async loadRange(keyPrefix) {
        console.log(`loadRange: ${keyPrefix}`)

        const keys = await this.redis.keys(this.getRedisKey(keyPrefix, true))

        try {
            const res = (await this.redis.mget(keys))
                .map((redisVal, ind) => (
                    {
                        key: this.getStorageKey(keys[ind]), // mget guarantees same order as provided keys 
                        data: redisVal !== null ? new TextEncoder().encode(redisVal) : undefined
                    }
                ))
            
            console.log(`loadRange - res: ${res}`)
            
            return res
        } catch (error) {
            console.error(`error while fetching many values from redis: ${error}`)
            return keys.map(key => (
                {
                    key: this.getStorageKey(key),
                    data: undefined
                }
            ))
        }
    }

    async removeRange(keyPrefix) {
        console.log(`removeRange: ${keyPrefix}`)

        try {
            const keys = await this.redis.keys(this.getRedisKey(keyPrefix, true))
            this.redis.del(keys)
        } catch (error) {
            console.error(`error while removing values from redis: ${error}`)
        }
    }
}
