(function(){

	var graph = {


		graphLineConfig: {
			type: 'scatter',
			mode: 'lines',
			line: {
				color: 'rgb(87, 6, 140)',
				width: 2
			}
		},

		axisNames: {
	        ewt: '(minutes)',
	        rbt: '(minutes)',
	        speed: '(mph)'
		},

		metricHovers: {
	        ewt: 'avg. wait',
	        rbt: 'planning buffer',
	        speed: 'avg speed'
		},


		drawRouteLineCharts: function() {
			console.log("drawing route line charts...");

			var time_x = [];
			var time_y = [];

			// build time series arrays
			Object.keys(tc.selectionData).sort().forEach(function(date) {
				if (tc.selectionData[date]["route"]) {
					time_x.push(date);
					time_y.push(tc.selectionData[date]["route"][tc.selection.metric]);
				};
			});

			// this will dynamically be one of: month, year, all-time
			var longLine = Object.create(graph.graphLineConfig);
			longLine["x"] = time_x;
			longLine["y"] = time_y;
			longLine["name"] = graph.metricHovers[tc.selection.metric];

			var weekLine = Object.create(graph.graphLineConfig);
			weekLine["x"] = time_x.slice(-7);
			weekLine["y"] = time_y.slice(-7);
			weekLine["name"] = graph.metricHovers[tc.selection.metric];

			var timeLayout = {
				yaxis: {
					title: graph.axisNames[tc.selection.metric],
					hoverformat: '.1f'
				},
				xaxis: {
					zeroline: false
				},
				margin: {
					"l": 40,
					"r": 20,
					"b": 30,
					"t": 0,
					"pad": 0
				},
				width: 640,
				height: 250
			};

			Plotly.newPlot("long-chart", [longLine], timeLayout, {displayModeBar: false});
			Plotly.newPlot("week-chart", [weekLine], timeLayout, {displayModeBar: false});
		},


		drawRouteEwtChart: function (stopEwtMap) {
			console.log("drawing route EWT bar chart...");

			if (tc.selection.metric == 'ewt') {
				$("#stop-chart div").remove();

				// master data list for bar chart
				// items in form [ewt, stop_name, stop_sequence]
				var master = [];

				Object.keys(stopEwtMap).forEach(function(stop){
					master.push([
						stopEwtMap[stop],
						tc.stopLookup[tc.selection.direction][stop]["name"],
						tc.stopLookup[tc.selection.direction][stop]["sequence"]
					]);
				});

				// ensure stops are sorted by sequence
				master.sort(function(a, b) {
					return a[2] - b[2];
				});

				// generate x-axis
				var x_count = [];
				for (i=0; i < master.length; i++) {
					x_count[i] = i+1;
				};

				var stopsLine = {
					x: x_count,
					y: master.map(function(oneBar) {return oneBar[0]}),
					type: "bar",
					text: master.map(function(oneBar) {return oneBar[1]}),
					name: graph.metricHovers[tc.selection.metric],
					marker: {
						color: 'rgb(87, 6, 140)'
					}
				};

				var stopsLayout = {
					xaxis: {
						range: [1, master.length + 1],
						zeroline: false
					},
					yaxis: {
						title: graph.axisNames[tc.selection.metric],
						hoverformat: '.1f'
					},
					margin: {
						"l": 40,
						"r": 20,
						"b": 30,
						"t": 0,
						"pad": 0
					},
					showlegend: false,
					width: 640,
					height: 250,
					bargap: 0.1
				};

				Plotly.newPlot("stop-chart", [stopsLine], stopsLayout, {displayModeBar: false});

			} else {
				$("#stop-chart div").remove();
				$("#stop-chart").append("<div>No stop chart for speed.</div>")
			};
		},


		drawCumulativeLineChart: function(stopTrips) {
			console.log("drawing cumulative line charts...");

			// master data list for cumulative chart
			// items in form [x_count, schedule_trip, actual_trip, stop_name, stop_sequence]
			var preMaster = [];

			Object.keys(stopTrips).forEach(function(stop) {
				preMaster.push([
					stopTrips[stop].s_trip,
					stopTrips[stop].m_trip,
					tc.stopLookup[tc.selection.direction][stop]["name"],
					tc.stopLookup[tc.selection.direction][stop]["sequence"]
				]);
			});

			// ensure stops are sorted by sequence (in place)
			preMaster.sort(function(a, b) {
				return a[3] - b[3];
			});

			// have the option here to cut off the first few trips, to clean up accumulative charts
			var master = preMaster.slice(tc.accumCutoff);

			// generate x-axis
			var x_count = [];
			for (i=0; i < master.length; i++) {
				x_count[i] = i+1;
			};

			var sTrips = master.map(function(a) { return a[0] });
			var mTrips = master.map(function(a) { return a[1] });

			var sTripCum = [];
			sTrips.reduce(function(a, b, i) { return sTripCum[i] = a + b; }, 0);
			var mTripCum = [];
			mTrips.reduce(function(a, b, i) { return mTripCum[i] = a + b; }, 0);

			var accSchedLine = {
				name: "scheduled",
				x: x_count,
				y: sTripCum,
				line: {
			    	color: '#aaaaaa',
			    	width: 3,
					shape: 'spline',
					dash: 'dot'
				},
				showlegend: true
			};

			var accActualLine = {
				name: "actual",
				text: master.map(function(a) {return a[2]}),
				x: x_count,
				y: mTripCum,
				line: {
			    	color: '#57068c',
		    		width: 3,
					shape: 'spline'
				},
				showlegend: true
			};

			var stackedAccData = [
				accSchedLine,
				accActualLine
			];

			var timeLayout = {

				yaxis: {
					title: "(minutes)",
					hoverformat: '.1f'
				},
				margin: {
			    	"l": 40,
			    	"r": 20,
			    	"b": 0,
			    	"t": 30,
			    	"pad": 0
			  	},
				width: 600,
				height: 380,
				xaxis: {zeroline: false},
				showlegend: true,
				legend: {"orientation": "h"}
			};

			Plotly.newPlot("accumulative-chart", stackedAccData, timeLayout, {displayModeBar: false});
		},


		drawJourneyLineCharts: function(data) {
			console.log("drawing journey line charts...");

			var master = []
			Object.keys(data).forEach(function(date) {
				master.push([
					date,
					data[date]["awt"],
					data[date]["m_trip"]
				]);
			});

			master.sort(function(a, b) {
				var a = new Date(a[0]);
				var b = new Date(b[0]);
				return a - b;
			});

			var time_x = master.map(function(el) { return el[0] });
			var time_y_wait = master.map(function(el) { return el[1] });
			var time_y_trip = master.map(function(el) { return el[2] });

			var monthWaitLine = Object.create(graph.graphLineConfig);
			monthWaitLine.name = "avg. wait time";
			monthWaitLine.x = time_x;
			monthWaitLine.y = time_y_wait;
			monthWaitLine.fill = 'tozeroy';
			monthWaitLine.line = {
				color: 'rgb(74, 79, 85)',
				width: 3
			};
			monthWaitLine.showlegend = false;

			var monthTripLine = Object.create(graph.graphLineConfig);
			monthTripLine.name = "avg. trip time";
			monthTripLine.x = time_x;
			monthTripLine.y = time_y_trip;
			monthTripLine.fill = 'tonexty';
			monthTripLine.showlegend = false;

			var stackedMonthData = [
				monthWaitLine,
				monthTripLine
			];

			var weekWaitLine = Object.create(monthWaitLine);
			weekWaitLine.x = time_x.slice(-7);
			weekWaitLine.y = time_y_wait.slice(-7);

			var weekTripLine = Object.create(monthTripLine);
			weekTripLine.x = time_x.slice(-7);
			weekTripLine.y = time_y_trip.slice(-7);

			var stackedWeekData = [
				weekWaitLine,
				weekTripLine
			];

			var timeLayout = {
				yaxis: {
					title: "Journey Time (mins)",
					hoverformat: '.1f'
				},
				margin: {
					"l": 40,
					"r": 20,
					"b": 30,
					"t": 20,
					"pad": 0
				},
				width: 600,
				height: 300
			};

			// function provided by plotly to format data for stacked area chart
			function stackedArea(stackedData) {
				for(var i=1; i < stackedData.length; i++) {
					for(var j=0; j < (Math.min(stackedData[i]['y'].length, stackedData[i-1]['y'].length)); j++) {
						stackedData[i]['y'][j] += stackedData[i-1]['y'][j];
					}
				}
				return stackedData;
			};

			Plotly.newPlot("journey-month-chart", stackedArea(stackedMonthData), timeLayout, {displayModeBar: false});
			Plotly.newPlot("journey-week-chart", stackedArea(stackedWeekData), timeLayout, {displayModeBar: false});
		},


		// draw three stacked bars for selected date: (swt + s_trip), (awt + m_trip), and (ewt_95 + trip_95)
		drawJourneyBarChart: function(data) {
			console.log("drawing journey bar charts...");
			
			var waitData = {
				x: ["Scheduled", "Average", "Planning"],
				y: [data.swt, data.awt, data.ewt_95 + data.swt],
				name: 'Wait Time',
				type: 'bar',
				marker: {
					color: 'rgb(74, 79, 85)',
					line: {
				      color: 'rgb(74, 79, 85)',
				      width: 2
				    }
				},
				showlegend: false,
				opacity: 0.5,
				hoverinfo: "name+y"
			};

			var onboardData = {
				x: ["Scheduled", "Average", "Planning"],
				// here, we temper our 95th percentile trip time, by mixing it with our average trip time at the specified fraction
				y: [data.s_trip, data.m_trip, (tc.fractionIs95 * data.trip_95) + ((1 - tc.fractionIs95) * data.m_trip)],
				name: 'Onboard Time',
				type: 'bar',
				marker: {
					color: 'rgb(87, 6, 140)',
					line: {
				      color: 'rgb(87, 6, 140)',
				      width: 2,
				    }
				},
				showlegend: false,
				opacity: 0.5,
				hoverinfo: "name+y"
			};

			var barData = [waitData, onboardData];

			var barLayout = {
				barmode: "stack",
				autosize: true,
				bargap: 0.3,
				bargroupgap: 0.02,
				yaxis: {
					title: "Journey Time (mins",
					hoverformat: '.1f'
				},
				margin: {
					"l": 40,
					"r": 20,
					"b": 30,
					"t": 10,
					"pad": 0
				},
				width: 300,
				height: 360
			};

			Plotly.newPlot("journey-bar-chart", barData, barLayout, {displayModeBar: false});

			Plotly.Fx.hover("journey-bar-chart", [
		        {curveNumber: 0, pointNumber: 0},
		        {curveNumber: 1, pointNumber: 0}
		    ]);
		},

	};

	// add graph namespace to global window scope
	this.graph = graph;
	console.log('running tc_graphs.js');
})();
