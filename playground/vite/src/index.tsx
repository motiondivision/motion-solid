import { render } from '@solidjs/web'
import { App } from './App'
import { installDiagnostics } from './diagnostics'
import './style.css'

installDiagnostics()
render(() => <App />, document.getElementById('root')!)
