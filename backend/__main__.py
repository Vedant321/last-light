import uvicorn
from .config import Settings
if __name__=='__main__':
    settings=Settings()
    uvicorn.run('backend.app:create_app',factory=True,host=settings.host,port=settings.port,log_level='info')
