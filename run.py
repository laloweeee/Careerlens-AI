import uvicorn
import webbrowser
import threading

def open_browser():
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    threading.Timer(1.5, open_browser).start()
    uvicorn.run("api.index:app", host="0.0.0.0", port=8000, reload=True,
                reload_dirs=["api", "core", "static"])
