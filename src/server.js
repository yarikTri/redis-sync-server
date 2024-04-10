// @ts-check
import express from "express"
import { WebSocketServer } from "ws"
import { Repo } from "@automerge/automerge-repo"
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket"
import os from "os"
import cors from "cors"
import { RedisStorageAdapter } from "./redisStorageAdapter.js"

export class Server {
  /** @type WebSocketServer */
  #socket

  /** @type ReturnType<import("express").Express["listen"]> */
  #server

  /** @type {((value: any) => void)[]} */
  #readyResolvers = []

  #isReady = false

  /** @type Repo */
  #repo

  constructor() {
    var hostname = os.hostname()

    this.#socket = new WebSocketServer({ noServer: true })

    const PORT =
      process.env.LISTEN_PORT !== undefined ? parseInt(process.env.LISTEN_PORT) : 3030
    const app = express()
    app.use(express.static("public"))
    app.use(cors())

    const REDIS_PORT =
      process.env.REDIS_PORT !== undefined ? parseInt(process.env.REDIS_PORT) : 6379
    const REDIS_HOST =
      process.env.REDIS_HOST !== undefined ? process.env.REDIS_HOST : 'localhost'
    const REDIS_PASSWORD =
      process.env.REDIS_PASSWORD !== undefined ? process.env.REDIS_PASSWORD : ''

    const config = {
      network: [new NodeWSServerAdapter(this.#socket)],
      storage: new RedisStorageAdapter(REDIS_PORT, REDIS_HOST, REDIS_PASSWORD),
      /** @ts-ignore @type {(import("@automerge/automerge-repo").PeerId)}  */
      peerId: `storage-server-${hostname}`,
      // Since this is a server, we don't share generously — meaning we only sync documents they already
      // know about and can ask for by ID.
      sharePolicy: async () => false,
    }
    this.#repo = new Repo(config)

    app.get("/", (req, res) => {
      res.send(`👍 @yavka/notes-sync-server is running`)
    })

    this.#server = app.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`)
      this.#isReady = true
      this.#readyResolvers.forEach((resolve) => resolve(true))
    })

    this.#server.on("upgrade", (request, socket, head) => {
      this.#socket.handleUpgrade(request, socket, head, (socket) => {
        console.log(1)
        this.#socket.emit("connection", socket, request)
      })
    })
  }

  async ready() {
    if (this.#isReady) {
      return true
    }

    return new Promise((resolve) => {
      this.#readyResolvers.push(resolve)
    })
  }

  close() {
    this.#socket.close()
    this.#server.close()
  }
}
