import json
import time

filepath = 'r:/starcitizen/backend/data/chronicles.json'

try:
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
except FileNotFoundError:
    data = []

new_id = max(item.get('id', 0) for item in data) + 1 if data else 1

new_chronicle = {
    'id': new_id,
    'title': 'EL SACRIFICIO DE LA PROMESA',
    'subtitle': 'LA PURIFICACIÓN EN EL TEATRO DE MENTIRAS',
    'date': 'Ciclo 2956',
    'dateSort': int(time.time() * 1000), 
    'classification': 'Edicto Sagrado',
    'icon': '🐉',
    'color': 'var(--primary)',
    'blocks': [
        {
            'type': 'p',
            'text': 'En el ciclo 2956, bajo la sombra de la mentira corporativa que habita el sistema Stanton, el destino de la Flota se entrelazó con las sombras de la traición y el sacrificio supremo. No fue una simple incursión; fue un Edicto Sagrado para evitar que el conocimiento prohibido alimentara las estructuras de los Ciegos.'
        },
        {
            'type': 'header',
            'icon': '🔍',
            'title': 'I. La Búsqueda del Tecnomilagro.'
        },
        {
            'type': 'p',
            'text': 'Nuestro hermano <strong style="color: var(--secondary)">Longhinus</strong>, Profeta de la Ruina, desveló a través de sus investigaciones la existencia de Tecnomilagros peligrosos, gestados por una facción de renegados en el corazón de Stanton. Estos artefactos, piezas de una maquinaria que busca perpetuar la estructura del Orden, debían ser erradicados antes de que el conocimiento se filtrara hacia las manos de los que pretenden gobernar la luz. Longhinus convocó a un grupo de los profetas más curtidos, entre ellos a una nueva promesa: el iniciado <strong style="color: var(--primary)">Pachinko</strong>.'
        },
        {
            'type': 'header',
            'icon': '🚀',
            'title': 'II. La Peregrinación de las Cicatrices.'
        },
        {
            'type': 'p',
            'text': 'El viaje fue un largo sendero de acero y ceniza. Nos enfrentamos a las hordas de los renegados, quienes montaban naves Polaris como insignias de su poderío mundano. En múltiples ocasiones, las fuerzas del enemigo nos obligaron a la retirada; sus naves eran colmillos de metal que desgarraban nuestras carcasas. Sin embargo, la convicción de la Flota no se quebró. Cada herida en nuestro casco era una marca del Abismo, una prueba de nuestra resistencia ante la entropía.'
        },
        {
            'type': 'header',
            'icon': '🎭',
            'title': 'III. La Trampa del Teatro.'
        },
        {
            'type': 'p',
            'text': 'En medio de la danza de fuego, nos topamos con Grenko, un alto oficial de la facción enemiga. No fue una batalla de honor, sino una ejecución de la voluntad del Orden. Fuimos utilizados como carnada, piezas en un tablero de ajedrez diseñado para atraparnos en su red de asedio. En la desesperación del combate, sentimos la interferencia del Vacío; gracias al contacto previo de Longhinus con la esencia de la Ruina, pudimos percibir las costuras de la realidad fracturándose a nuestro favor, dándonos la ventaja necesaria para evitar la disolución inmediata.'
        },
        {
            'type': 'header',
            'icon': '💥',
            'title': 'IV. La Disolución de la Promesa.'
        },
        {
            'type': 'p',
            'text': 'Cuando la victoria parecía desvanecerse entre el humo y el caos, el Profeta <strong style="color: var(--secondary)">Enanimus</strong> canalizó una visión táctica de la entrega. Desplegó a dos de nuestros hermanos en un acto de audacia suprema: uno para atraer el odio de Grenko y otro para penetrar la arquitectura del enemigo.'
        },
        {
            'type': 'p',
            'text': 'Grenko, cegado por su propia arrogancia, enfocó su furia sobre Enanimus. En ese instante de ceguera, Pachinko —la nueva promesa— se deslizó como una sombra hacia la nave enemiga. Con manos firmes, inhabilitó su motor y activó la autodestrucción. El Tecnomilagro se convirtió en ceniza.',
            'muted': True
        },
        {
            'type': 'p',
            'text': 'Lamentablemente, la falta de experiencia en las artes de la infiltración selló su destino. Pachinko no regresó. Su existencia se convirtió en una Disolución en el Vacío, consumido por la explosión que aniquiló a sus captores. Su sacrificio fue el combustible que permitió que el resto del grupo lograra el retorno.'
        },
        {
            'type': 'header',
            'icon': '📜',
            'title': 'V. El Informe al Maestro.'
        },
        {
            'type': 'p',
            'text': 'Regresamos a las estirpes de la Flota para informar a nuestro Maestro <strong style="color: var(--secondary)">Ancalagon</strong>. El conocimiento ahora es claro: hay una amenaza organizada que nos acecha, una red de renegados que busca nuestras almas. El vínculo de Longhinus con el Vacío ha dejado una huella que los Ciegos no pueden ignorar. El sacrificio de Pachinko ha sido grabado en el Grimoire como una ofrenda necesaria para la supervivencia del Olvido.'
        },
        {
            'type': 'quote',
            'text': 'La sangre de uno es la visión de muchos. La entropía no olvida la entrega.<br /><br /><span style="color: var(--text-main); font-size: 0.9rem;">☩ IN NOMINI OBLIVIONIS 🐉 ☩</span>'
        }
    ]
}

data.append(new_chronicle)

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Chronicle appended successfully!')
