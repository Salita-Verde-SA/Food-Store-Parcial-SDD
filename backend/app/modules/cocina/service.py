import asyncio
from typing import Set, Dict, Any

class CocinaService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(CocinaService, cls).__new__(cls, *args, **kwargs)
            cls._instance._init()
        return cls._instance

    def _init(self):
        self._queues: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def register_client(self) -> asyncio.Queue:
        """
        Registra un cliente SSE creando y retornando una nueva cola de eventos.
        """
        async with self._lock:
            queue = asyncio.Queue()
            self._queues.add(queue)
            return queue

    async def unregister_client(self, queue: asyncio.Queue):
        """
        Desregistra un cliente SSE eliminando su cola.
        """
        async with self._lock:
            if queue in self._queues:
                self._queues.remove(queue)

    async def broadcast_event(self, event_type: str, data: Dict[str, Any]):
        """
        Difunde un evento en tiempo real a todas las colas de clientes conectados.
        """
        async with self._lock:
            if not self._queues:
                return
            for queue in self._queues:
                await queue.put({"event": event_type, "data": data})

# Instancia singleton global
cocina_service = CocinaService()
