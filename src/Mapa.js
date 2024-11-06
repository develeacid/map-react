import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css"; // Importa los estilos de OpenLayers
import { Map, View } from "ol"; // Importa las clases Map y View de OpenLayers
import TileLayer from "ol/layer/Tile"; // Importa la clase TileLayer para capas de teselas
import OSM from "ol/source/OSM"; // Importa la fuente de teselas OpenStreetMap
import VectorLayer from "ol/layer/Vector"; // Importa la clase VectorLayer para capas vectoriales
import VectorSource from "ol/source/Vector"; // Importa la clase VectorSource para fuentes vectoriales
import GeoJSON from "ol/format/GeoJSON"; // Importa el formato GeoJSON para leer datos GeoJSON
import { useGeographic } from "ol/proj"; // Importa la función useGeographic para usar coordenadas geográficas
import { Style, Stroke, Fill, Circle as OlCircle } from "ol/style"; // Importa clases de estilo para las características del mapa, incluyendo Circle
import Draw from "ol/interaction/Draw"; // Importa la interacción Draw para dibujar en el mapa
import * as turf from "@turf/turf"; // Importa la biblioteca Turf.js para operaciones geoespaciales
import puntosData from "./denue_inegi_20_.json"; // Importa los datos de puntos del DENUE

function Mapa() {
  const mapRef = useRef(); // Referencia al elemento del mapa
  const [map, setMap] = useState(null); // Estado para almacenar la instancia del mapa
  const [drawLayer, setDrawLayer] = useState(null); // Estado para almacenar la capa donde se dibujarán los polígonos
  const [denueLayer, setDenueLayer] = useState(null); // Estado para almacenar la capa de puntos del DENUE
  const [polygonsData, setPolygonsData] = useState([]); // Estado para almacenar los datos de los polígonos dibujados y los puntos dentro de ellos
  const [drawingActive, setDrawingActive] = useState(false); // Estado para controlar si la herramienta de dibujo está activa
  const [savedQueries, setSavedQueries] = useState([]); // Estado para almacenar las consultas guardadas (simulación de base de datos)

  useGeographic(); // Indica a OpenLayers que se utilizarán coordenadas geográficas

  useEffect(() => {
    // Este useEffect se ejecuta solo una vez al montar el componente

    // Crea una fuente vectorial con los datos GeoJSON importados
    const puntosSource = new VectorSource({
      features: new GeoJSON().readFeatures(puntosData),
    });

    // Crea una capa vectorial para los puntos del DENUE
    const denueLayer = new VectorLayer({
      source: puntosSource,
      style: new Style({
        image: new OlCircle({
          // Estilo de círculo para los puntos
          radius: 5, // Radio del círculo
          fill: new Fill({
            color: "red", // Color de relleno del círculo
          }),
        }),
      }),
    });

    // Crea una fuente vectorial para la capa de dibujo
    const drawSource = new VectorSource();

    // Crea una capa vectorial para los polígonos dibujados
    const drawLayer = new VectorLayer({
      source: drawSource,
      style: new Style({
        // Estilo para los polígonos dibujados
        stroke: new Stroke({
          color: "blue", // Color del borde
          width: 2, // Ancho del borde
        }),
        fill: new Fill({
          color: "rgba(0, 0, 255, 0.1)", // Color de relleno
        }),
      }),
    });

    // Crea una instancia del mapa de OpenLayers
    const initialMap = new Map({
      target: mapRef.current, // Elemento donde se renderizará el mapa
      layers: [
        new TileLayer({
          source: new OSM(), // Capa base de OpenStreetMap
        }),
        drawLayer, // Capa para dibujar polígonos
        denueLayer, // Capa de puntos del DENUE
      ],
      view: new View({
        center: [-96.769722, 17.066167], // Coordenadas del centro inicial
        zoom: 9, // Nivel de zoom inicial
      }),
    });

    setMap(initialMap); // Guarda la instancia del mapa en el estado
    setDrawLayer(drawLayer); // Guarda la capa de dibujo en el estado
    setDenueLayer(denueLayer); // Guarda la capa de puntos del DENUE en el estado

    // Función de limpieza que se ejecuta al desmontar el componente
    return () => {
      initialMap.setTarget(null); // Elimina el mapa del elemento
      initialMap.getLayers().clear(); // Limpia las capas del mapa
      initialMap.dispose(); // Libera recursos del mapa
    };
  }, []); // El array vacío indica que este useEffect se ejecuta solo una vez

  useEffect(() => {
    // Este useEffect se ejecuta cuando cambia el estado del mapa o drawingActive

    if (map && drawingActive) {
      // Si el mapa está listo y la herramienta de dibujo está activa
      // Crea una nueva interacción de dibujo de tipo "Polygon"
      const drawInteraction = new Draw({
        source: drawLayer.getSource(), // La fuente donde se guardará el polígono dibujado
        type: "Polygon", // Tipo de geometría a dibujar
        minPoints: 3, // Mínimo de puntos para formar un polígono
      });

      // Agrega un event listener para el evento "drawend" (cuando se termina de dibujar el polígono)
      drawInteraction.on("drawend", (event) => {
        const polygon = event.feature.getGeometry().getCoordinates(); // Obtiene las coordenadas del polígono dibujado
        const turfPolygon = turf.polygon(polygon); // Crea un polígono Turf.js a partir de las coordenadas

        // Filtra los puntos que están dentro del polígono dibujado
        const puntosDentro = puntosData.features.filter((point) => {
          const pointCoords = point.geometry.coordinates;
          const turfPoint = turf.point(pointCoords); // Crea un punto Turf.js a partir de las coordenadas del punto
          return turf.booleanPointInPolygon(turfPoint, turfPolygon); // Verifica si el punto está dentro del polígono
        });

        // Actualiza el estado polygonsData con los nuevos datos del polígono y los puntos dentro de él
        setPolygonsData((prevPolygonsData) => [
          ...prevPolygonsData,
          { polygon, puntosDentro },
        ]);

        setDrawingActive(false); // Desactiva la herramienta de dibujo después de dibujar un polígono
      });

      map.addInteraction(drawInteraction); // Agrega la interacción de dibujo al mapa

      // Función de limpieza que se ejecuta cuando se desmonta el componente o cambia el estado del mapa o drawingActive
      return () => {
        map.removeInteraction(drawInteraction); // Elimina la interacción de dibujo del mapa
      };
    }
  }, [map, drawingActive]); // Este useEffect se volverá a ejecutar si cambia el mapa o drawingActive

  // Función para activar/desactivar la herramienta de dibujo
  const handleDrawToggle = () => {
    setDrawingActive(!drawingActive); // Cambia el estado de drawingActive
  };

  // Función para limpiar la búsqueda y los polígonos dibujados
  const handleClearSearch = () => {
    drawLayer.getSource().clear(); // Limpia la fuente de la capa de dibujo (elimina los polígonos)
    setPolygonsData([]); // Limpia el estado polygonsData
  };

  // Función para guardar la consulta actual (polígonos dibujados)
  const handleSaveQuery = () => {
    setSavedQueries((prevSavedQueries) => [
      ...prevSavedQueries, // Mantiene las consultas anteriores
      { polygonsData }, // Agrega la nueva consulta con los datos de los polígonos
    ]);
    alert("Consulta guardada exitosamente.");
  };

  // Función para cargar una consulta guardada
  const handleLoadQuery = (index) => {
    const selectedQuery = savedQueries[index]; // Obtiene la consulta seleccionada
    setPolygonsData(selectedQuery.polygonsData); // Actualiza el estado con los datos de la consulta

    drawLayer.getSource().clear(); // Limpia la capa de dibujo antes de cargar la consulta
    selectedQuery.polygonsData.forEach((data) => {
      // Crea una característica de OpenLayers a partir de los datos del polígono
      const feature = new GeoJSON().readFeature(turf.polygon(data.polygon), {
        featureProjection: "EPSG:3857", // Proyección del mapa
      });
      drawLayer.getSource().addFeature(feature); // Agrega la característica a la capa de dibujo
    });
  };

  return (
    <div>
      <div
        style={{
          padding: "10px",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
          marginBottom: "10px",
        }}
      >
        <h4>Instrucciones de uso:</h4>
        <p>
          Para realizar una búsqueda, activa el filtro y dibuja un área en el
          mapa. Puedes dibujar múltiples áreas y segmentar los resultados.
        </p>
        <button
          onClick={handleDrawToggle}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          {drawingActive ? "Desactivar filtro" : "Activar filtro"}
        </button>
        <button
          onClick={handleClearSearch}
          disabled={polygonsData.length === 0}
          style={{
            padding: "8px 16px",
            backgroundColor: polygonsData.length === 0 ? "#ccc" : "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: polygonsData.length === 0 ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          Limpiar búsqueda
        </button>
        <button
          onClick={handleSaveQuery}
          disabled={polygonsData.length === 0}
          style={{
            padding: "8px 16px",
            backgroundColor: polygonsData.length === 0 ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: polygonsData.length === 0 ? "not-allowed" : "pointer",
            marginLeft: "10px",
          }}
        >
          Guardar consulta
        </button>
      </div>

      <div
        ref={mapRef}
        style={{ width: "100%", height: "500px", marginBottom: "20px" }}
      />

      {polygonsData.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Resultados de búsqueda por polígono:</h3>
          {polygonsData.map((data, index) => (
            <div key={index} style={{ marginBottom: "20px" }}>
              <h4>Polígono {index + 1}:</h4>
              <ul>
                {data.puntosDentro.map((point, idx) => {
                  const propiedades = point.properties;
                  return (
                    <li key={idx}>
                      {propiedades.nom_estab || "Sin nombre"} -{" "}
                      {propiedades.nombre_act || "Actividad desconocida"}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {savedQueries.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Consultas guardadas:</h3>
          {savedQueries.map((query, index) => (
            <button
              key={index}
              onClick={() => handleLoadQuery(index)}
              style={{
                display: "block",
                marginBottom: "10px",
                padding: "8px 16px",
                backgroundColor: "#ffc107",
                color: "black",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cargar consulta {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Mapa;
