import streamlit as st
import google.generativeai as genai
import pandas as pd
from datetime import datetime

# 1. Configuración de la página
st.set_page_config(page_title="Mi App con IA", page_icon="🤖")

# 2. Conexión con Google Gemini (El cerebro)
# OJO: La clave la configuraremos en el Paso 5, no la pegues aquí directamente.
try:
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
except:
    st.error("Falta configurar la API Key en los 'Secrets' de Streamlit.")

# 3. Función para obtener respuesta de la IA
def get_ai_response(pregunta):
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(pregunta)
        return response.text
    except Exception as e:
        return f"Error: {e}"

# 4. La Interfaz Gráfica (Lo que ve el usuario)
st.title("🤖 Mi Asistente IA Personal")
st.write("Escribe abajo para interactuar con la IA.")

user_input = st.text_input("Escribe tu pregunta o dato aquí:")

# 5. Lógica de guardado de datos (Base de datos simple)
if "historial" not in st.session_state:
    st.session_state.historial = []

if st.button("Enviar y Guardar"):
    if user_input:
        # a) Obtener respuesta
        with st.spinner('Pensando...'):
            respuesta_ia = get_ai_response(user_input)
        
        # b) Mostrar respuesta
        st.success("Respuesta generada:")
        st.write(respuesta_ia)
        
        # c) Guardar en memoria temporal
        nuevo_dato = {
            "Fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Pregunta": user_input,
            "Respuesta": respuesta_ia
        }
        st.session_state.historial.append(nuevo_dato)
    else:
        st.warning("Por favor escribe algo primero.")

# 6. Mostrar y Descargar Datos
if len(st.session_state.historial) > 0:
    st.divider()
    st.subheader("📂 Datos Guardados")
    df = pd.DataFrame(st.session_state.historial)
    st.dataframe(df)

    # Botón para descargar tu "Base de Datos" en CSV (Excel)
    csv = df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="Descargar mis datos (CSV)",
        data=csv,
        file_name='mis_datos_ia.csv',
        mime='text/csv',
    )
