// IMPORTANT NOTE: If you rebuild this app, you must add "var app;" to the new
// deploy/App...html files just above "Rally.onReady(function () {"
//
Ext.define('CustomApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    scopeType: 'iteration',
    componentCls: 'app',
    html: '<table><tr><td>' +
        '<div title="Create a task and assign it with estimate or enter initial capacity on the Team Status page.">' +
        '<b style="text-align:left;float:left;">' +
        '</b></div></td><td><div>' +
        '<input type="button" style="text-align:right;float:right;" value="Refresh" onClick="javascript: app.onScopeChange();"/></div>' +
        '</td></tr></table>',
    comboboxConfig: {
        fieldLabel: 'Select an Iteration:</div>',
        width: 400
    },
    onScopeChange: function() {
        console.log('onScopeChange');
        var iOID = this.getContext().getTimeboxScope().getRecord().get("ObjectID");
        if (this.getContext().getTimeboxScope().getRecord() === null) {
            alert("You must specify a valid Iteration/Sprint. Unscheduled is not supported.");
        } else {
          var capacityStore = Ext.create('Rally.data.wsapi.Store', {
              model: 'UserIterationCapacity',
              fetch: ['User', 'Capacity', 'TaskEstimates', 'Load'],
              filters: this._getFilters(iOID),
              sorters: [{
                  property: 'User',
                  direction: 'ASC'
              }],
              pageSize: 200
          });
          capacityStore.load().then({
              success: function(capacities) {
                //debugger;
                console.log('capacityStore.load promise success');
                var storyStore = Ext.create('Rally.data.wsapi.Store', {
                      model: 'User Story',
                      fetch: ['Owner', 'PlanEstimate'],
                      filters: this._getFilters(iOID),
                      sorter: [{
                          property: 'Owner',
                      }],
                      pageSize: 200
                });

                storyStore.load().then({
                  success: function(stories) {
                    console.log('storyStore load promise success');
                    // console.log(stories);
                    //debugger;

                    //define a custom data model
                    // Ext.define('CustomCapacity', {
                    //   extend: 'Rally.data.model',
                    //   fields: [
                    //     {name: 'name', type: 'string'},
                    //     {name: 'points', type: 'int', defaultValue: 0},
                    //     {name: 'capacity', type: 'int', defaultValue: 0},
                    //     {name: 'load', type: 'float', defaultValue: 0}
                    //   ]
                    // });

                    // define a store for the custom model
                    // var customStore = Ext.create('Rally.data.custom.Store', {
                    //   model: 'CustomCapacity'
                    // });

                    // an array to hold custom user iteration capacity objects
                    var pointTotals = [];
                    var index;
                    _.each(stories, function(story) {

                      //nomalize the owner name
                      var ownerName;
                      if (story.get('Owner') === null) {
                          ownerName = 'no owner';
                      } else {
                          ownerName = story.get('Owner')._refObjectName;
                      }

                      //normalize the point value
                      var pointval;
                      if (story.get('PlanEstimate') > 0) {
                          pointval = story.get('PlanEstimate');
                      } else {
                          pointval = 0;
                      }

                      //debugger;

                      //find c_uic obj in array by ownerName
                      var c_uic = pointTotals.find(function findOwner(pointTotal){
                        return (pointTotal.name === ownerName);
                      });
                      if (c_uic === undefined) {
                        //add new c_uic obj to array
                        c_uic = new Object();
                        c_uic.name = ownerName;
                        c_uic.pointEst = pointval;
                        c_uic.taskEst = 0;
                        c_uic.capacityHrs = 0;
                        c_uic.capacityPts = 0;
                        c_uic.pointLoad = 0.01;
                        c_uic.taskLoad = 0.01;
                        pointTotals.push(c_uic);
                      } else {
                        //update c_uic obj with new point total
                          c_uic.pointEst += pointval;
                      }
                    });
                    // end _.each
                    console.log(pointTotals);

                    pointTotals.forEach(function(currentValue){
                      //see if model/record exists in rally capacity store using findBy
                      //debugger;
                      var result = capacityStore.findBy(function(record) {
                        if(record.get('User')._refObjectName === currentValue.name) {
                          return true;
                        } else {
                          return false;
                        }
                      });
                      if (result !== -1) { //result contains index of record in store
                        currentValue.capacityHrs = capacityStore.getAt(result).get('Capacity');
                        currentValue.taskEst = capacityStore.getAt(result).get('TaskEstimates');
                        currentValue.taskLoad = capacityStore.getAt(result).get('Load');
                        currentValue.capacityPts = Ext.util.Format.round(capacityStore.getAt(result).get('Capacity') / 6, 1);
                        currentValue.pointLoad = (currentValue.pointEst * 6) / capacityStore.getAt(result).get('Capacity');
                      }
                    });
                    //debugger;
                    console.log(pointTotals);


                    //now setup the display object
                    // var gridrecords = _.map(pointTotals, function(pointTotal) {
                    //     return Ext.apply({
                    //         PointEstimates: pointTotals[capacity.get('User')._refObjectName],
                    //         PointLoad: (pointTotals[capacity.get('User')._refObjectName] * 6) / capacity.get('Capacity'),
                    //         UserName: capacity.get('User')._refObjectName,
                    //         PointCapacity: Ext.util.Format.round(capacity.get('Capacity') / 6, 1)
                    //     }, capacity.getData());
                    // });
                    // console.log(gridrecords);
                    if (this._myGrid) {
                        this._myGrid.destroy();
                    }
                    //debugger;
                    var cstore = Ext.create('Rally.data.custom.Store', {
                      data: pointTotals
                    //     fields: [
                    //           {name: 'name', type: 'string'},
                    //           {name: 'pointEst', type: 'int'},
                    //           {name: 'taskEst', type: 'int'},
                    //           {name: 'capacityHrs', type: 'int'},
                    //           {name: 'capacityPts', type: 'float'},
                    //           {name: 'taskLoad', type: 'float'},
                    //           {name: 'pointLoad', type: 'float'},
                    //     ]
                    });
                    cstore.loadData(pointTotals);
                    console.log(cstore);
                    debugger;
                    this._myGrid = Ext.create('Rally.ui.grid.Grid', {
                        xtype: 'rallygrid',
                        store: cstore,
                        showRowActionsColumn: false,
                        columnCfgs: [{
                            text: 'User',
                            dataIndex: 'name',
                        }, {
                            text: 'Point Est',
                            dataindex: 'pointEst',
                            width: 60,
                            align: 'center',
                            renderer: function(value) {
                              return value;
                            }
                        //     xtype: 'templatecolumn',
                        //     tpl: Ext.create('Rally.ui.renderer.template.progressbar.ProgressBarTemplate', {
                        //         percentDoneName: 'PointLoad',
                        //         calculateColorFn: function(recordData) {
                        //             var loadval = recordData.pointLoad;
                        //             if (loadval < 0.8) {
                        //                 colVal = '#B2E3B6'; // Green
                        //             } else if (loadval <= 1.0) {
                        //                 colVal = '#006600'; // Dark Green
                        //             } else if (loadval < 1.25) {
                        //                 colVal = '#FCB5B1'; // Red
                        //             } else {
                        //                 colVal = '#f61509'; // dark Red
                        //             }
                        //             return colVal;
                        //         },
                        //         generateLabelTextFn: function(recordData) {
                        //           return recordData.pointEst + ' / ' + recordData.capacityPts;
                        //         }
                        //     })
                        // }, {
                        //     text: 'Task Est Load',
                        //     width: 60,
                        //     align: 'center',
                        //     xtype: 'templatecolumn',
                        //     tpl: Ext.create('Rally.ui.renderer.template.progressbar.ProgressBarTemplate', {
                        //         percentDoneName: 'Load',
                        //         calculateColorFn: function(recordData) {
                        //             var loadval = recordData.taskLoad;
                        //             if (loadval < 0.8) {
                        //                 colVal = '#B2E3B6'; // Green
                        //             } else if (loadval <= 1.0) {
                        //                 colVal = '#006600'; // Dark Green
                        //             } else if (loadval < 1.25) {
                        //                 colVal = '#FCB5B1'; // Red
                        //             } else {
                        //                 colVal = '#f61509'; // dark Red
                        //             }
                        //             return colVal;
                        //         },
                        //         generateLabelTextFn: function(recordData) {
                        //           return (recordData.TaskEstimates === null ? 0 : recordData.TaskEstimates) + ' / ' + (recordData.Capacity === null ? 0 : recordData.Capacity);
                        //         }
                        //
                        //     })
                        }]
                    });
                    app = this;
                    this.add(this._myGrid);
                  },
                  failure: function() {
                    console.log('storyStore.load promise failure');
                  },
                  scope: this
                });
              },
              failure: function() {
                  console.log('capacityStore.load promise failure');
              },
              scope: this
          });
        }
    },
    _getFilters: function(iName) {
        var filters = [];
        filters.push({
            property: 'Iteration.ObjectID',
            operator: '=',
            value: iName
        });
        return filters;
    },
});
