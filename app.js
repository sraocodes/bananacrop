/**
 * Vue.js Application for Watershed Data Visualization
 *
 * This script initializes a Vue app to visualize CSV time-series data on a Leaflet map.
 * It also plots selected variables using Chart.js.
 *
 * Technologies Used:
 * - Vue.js: Frontend framework for reactivity
 * - PapaParse: CSV parsing for loading data
 * - Leaflet: Interactive mapping
 * - Chart.js: Time-series visualization
 */




// ---------------------- Vue Instance Setup ----------------------
var app = new Vue({
    el: '#app',

    // ---------------------- Data Properties ----------------------
    data: {
        timeseriesData: [],    // Stores CSV time-series data
        watershedData: null,   // Stores GeoJSON data for watershed boundary
        availablePlots: [],    // List of unique plot names from CSV
        selectedPlot: '',      // Currently selected plot
        selectedVariable: 'moisture', // Default variable to display
        availableVariables: [
            { value: 'moisture', label: 'Soil Moisture', unit: '%', color: 'blue' },
            { value: 'lai', label: 'Leaf Area Index', unit: '', color: 'green' },  // Empty unit for LAI as it's unitless
            { value: 'HH', label: 'HH Backscatter', unit: 'dB', color: 'red' },
            { value: 'HV', label: 'HV Backscatter', unit: 'dB', color: 'orange' }
        ],
        map: null,             // Leaflet map instance
        boundaryLayer: null,   // GeoJSON boundary layer
        markerLayer: null,     // Layer for plot markers
        chart: null            // Chart.js instance
    },

    // ---------------------- Computed Properties ----------------------
    computed: {
        // Returns metadata about the currently selected variable (name, unit, color)
        currentVariableInfo() {
            return this.availableVariables.find(v => v.value === this.selectedVariable);
        }
    },


// ------------------------------------------------------------------------------- 
// HOOKS in Vue Life cycle ----------------------------------------------------------------------------------
// ------------------------------------------------------------------------------- 


// =============================================
// Before Creation:
// - Vue instance doesn't exist yet
// - No access to our data properties like timeseriesData, watershedData
// - Can't access our methods like updateChart, updatePlotMarker
// =============================================

// =============================================
// During Creation (created hook):
// What happens in our app:
// 1. Vue instance created
// 2. Our data properties become reactive:
//    - timeseriesData (for CSV)
//    - watershedData (for GeoJSON)
//    - availablePlots, selectedPlot, etc.
// 3. Perfect time to load our data files:
//    - Loads data.csv using Papa.parse
//    - Loads boundary.geojson using fetch
// 4. DOM elements (#map, #chartCanvas) not ready yet
// =============================================

    // ---------------------- Data Loading (CSV & GeoJSON) ----------------------
    created: function() {
        // Load CSV data using PapaParse
        Papa.parse("data.csv", {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                this.timeseriesData = results.data;
                this.availablePlots = [...new Set(results.data.map(row => row.plot))].sort();
                if (this.availablePlots.length > 0) {
                    this.selectedPlot = this.availablePlots[0];
                    this.updateChart();
                    this.updatePlotMarker();
                }
            }
        });

        // Load GeoJSON watershed boundary data
        fetch("boundary.geojson")
            .then(response => response.json())
            .then(data => {
                this.watershedData = data;
                if (this.map) {
                    this.addBoundaryLayer();
                }
            });
    },


// =============================================
// During Mounting (mounted hook):
// What happens in our app:
// 1. DOM is ready - can access #map and #chartCanvas
// 2. Initialize our map:
//    - Creates Leaflet map instance
//    - Sets view to watershed location
//    - Adds OpenStreetMap layer
// 3. Initialize our chart:
//    - Creates Chart.js instance
//    - Sets up axes and styling
// 4. If watershedData is loaded, adds boundary layer
// =============================================

    // ---------------------- Vue Mounted Lifecycle Hook ----------------------
    mounted: function() {
        // Initialize Leaflet map centered at watershed location
        this.map = L.map('map', { dragging: false, zoomControl: false, scrollWheelZoom: false })
            .setView([11.7468, 76.5573], 13);

        // Add OpenStreetMap tile layer for base map display
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        
        this.markerLayer = L.layerGroup().addTo(this.map);

        // Initialize Chart.js with proper axis labels
        var ctx = document.getElementById('chartCanvas').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '',
                    borderColor: '',
                    fill: false,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Value',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });

        if (this.watershedData) this.addBoundaryLayer();
    },

// After Mounting:
// - App is fully interactive
// - Methods can be called (onPlotChange, updateChart, etc.)
// - User can select plots and variables
// =============================================

    // ---------------------- Methods ----------------------
    methods: {

        /**
         * Handles changes in the selected plot.
         * Updates the map markers when a new plot is selected.
         */
        onPlotChange: function() {
            this.updatePlotMarker();
            this.updateChart();
        },

        /**
         * Handles changes in the selected variable.
         * Updates the chart when a different variable is selected.
         */
        onVariableChange: function() {
            this.updateChart();
        },

        /**
         * Adds the watershed boundary to the map.
         */
        addBoundaryLayer: function() {
            if (this.boundaryLayer) this.map.removeLayer(this.boundaryLayer);
            this.boundaryLayer = L.geoJSON(this.watershedData, { style: { color: 'blue', weight: 2 } }).addTo(this.map);
            this.map.fitBounds(this.boundaryLayer.getBounds());
        },

        /**
         * Updates plot markers dynamically:
         * - All plot markers remain visible.
         * - The selected plot's marker is highlighted (larger and red).
         */
        // Update the updatePlotMarker method
updatePlotMarker: function() {
    this.markerLayer.clearLayers();

    // Create a custom marker icon creator function
    const createMarkerIcon = (isSelected) => {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-pin ${isSelected ? 'selected' : ''}" style="
                width: ${isSelected ? '30px' : '25px'};
                height: ${isSelected ? '30px' : '25px'};
                background-color: ${isSelected ? 'rgba(255, 0, 0, 0.9)' : 'rgba(128, 128, 128, 0.5)'};
                border: 2px solid ${isSelected ? '#ff0000' : '#666'};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: ${isSelected ? 'white' : '#333'};
                transition: all 0.3s ease;
            ">
                <span style="font-size: ${isSelected ? '14px' : '12px'};">
                    ${isSelected ? '📍' : '•'}
                </span>
            </div>`,
            iconSize: isSelected ? [30, 30] : [25, 25],
            iconAnchor: isSelected ? [15, 15] : [12.5, 12.5],
            popupAnchor: [0, -10]
        });
    };

    // Loop through all available plots
    this.availablePlots.forEach(plot => {
        const plotData = this.timeseriesData.find(item => item.plot === plot);
        if (!plotData) return;

        const isSelected = plot === this.selectedPlot;

        // Create marker with custom icon
        const marker = L.marker([plotData.latitude, plotData.longitude], {
            title: `Plot ${plot}`,
            icon: createMarkerIcon(isSelected),
            zIndexOffset: isSelected ? 1000 : 0  // Selected marker appears on top
        });

        // Find the latest data entry for this plot
        const latestData = this.timeseriesData
            .filter(item => item.plot === plot)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        // Enhanced popup content with more structure and styling
        marker.bindPopup(`
            <div style="padding: 5px; min-width: 150px;">
                <div style="font-weight: bold; color: ${isSelected ? '#ff0000' : '#333'}; 
                           margin-bottom: 5px; font-size: 14px;">
                    Plot ${plot}
                </div>
                <div style="margin-bottom: 3px;">
                    <strong>${this.currentVariableInfo.label}:</strong><br>
                    ${latestData && latestData[this.selectedVariable]
                        ? latestData[this.selectedVariable].toFixed(2) + ' ' + this.currentVariableInfo.unit
                        : 'No Data'}
                </div>
                <div style="font-size: 12px; color: #666;">
                    Location: ${plotData.latitude.toFixed(4)}, ${plotData.longitude.toFixed(4)}
                </div>
            </div>
        `, {
            className: isSelected ? 'selected-popup' : 'normal-popup'
        });

        // Add hover effect
        marker.on('mouseover', function() {
            if (!isSelected) {
                this.setIcon(createMarkerIcon(true));
            }
        });

        marker.on('mouseout', function() {
            if (!isSelected) {
                this.setIcon(createMarkerIcon(false));
            }
        });

        marker.addTo(this.markerLayer);
    });
    },

        /**
         * Updates the chart dynamically based on the selected plot and variable.
         */
        updateChart: function() {
            const filtered = this.timeseriesData.filter(item => item.plot === this.selectedPlot);
            
            // Sort data by date
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Update chart labels and data
            this.chart.data.labels = filtered.map(item => item.date);
            this.chart.data.datasets[0].data = filtered.map(item => parseFloat(item[this.selectedVariable]));
            this.chart.data.datasets[0].label = this.currentVariableInfo.label;
            this.chart.data.datasets[0].borderColor = this.currentVariableInfo.color;

            // Dynamically adjust y-axis min/max based on data
            const values = filtered.map(item => parseFloat(item[this.selectedVariable]));
            const min = Math.min(...values);
            const max = Math.max(...values);
            const padding = (max - min) * 0.1; // Add 10% padding

            this.chart.options.scales.y.min = Math.floor(min - padding);
            this.chart.options.scales.y.max = Math.ceil(max + padding);
            this.chart.options.scales.y.title.text = `${this.currentVariableInfo.label} (${this.currentVariableInfo.unit})`;

            this.chart.update();
        }
    }
});