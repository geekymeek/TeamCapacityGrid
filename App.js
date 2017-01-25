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
                    var pointTotals = {};
                    _.each(stories, function(story) {
                        var ownerName, pointval;
                        if (story.get('Owner') === null) {
                            ownerName = 'no owner';
                        } else {
                            ownerName = story.get('Owner')._refObjectName;
                        }
                        if (story.get('PlanEstimate') > 0) {
                            pointval = story.get('PlanEstimate');
                        } else {
                            pointval = 0;
                        }
                        if (!pointTotals[ownerName]) {
                            pointTotals[ownerName] = pointval;
                        } else {
                            pointTotals[ownerName] += pointval;
                        }
                    });
                    // console.log(pointTotals);
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
                            console.log('capacityStore load promise success');
                            var gridrecords = _.map(capacities, function(capacity) {
                                return Ext.apply({
                                    PointEstimates: pointTotals[capacity.get('User')._refObjectName],
                                    PointLoad: (pointTotals[capacity.get('User')._refObjectName] * 6) / capacity.get('Capacity'),
                                    UserName: capacity.get('User')._refObjectName,
                                    PointCapacity: Ext.util.Format.round(capacity.get('Capacity') / 6, 1)
                                }, capacity.getData());
                            });
                            // console.log(gridrecords);
                            if (this._myGrid) {
                                this._myGrid.destroy();
                            }
                            this._myGrid = Ext.create("Rally.ui.grid.Grid", {
                                xtype: 'rallygrid',
                                store: Ext.create('Rally.data.custom.Store', {
                                    data: gridrecords
                                }),
                                showRowActionsColumn: false,
                                columnCfgs: [{
                                    text: 'User',
                                    dataIndex: 'UserName',
                                }, {
                                    text: 'Point Load',
                                    width: 60,
                                    align: 'center',
                                    xtype: 'templatecolumn',
                                    tpl: Ext.create('Rally.ui.renderer.template.progressbar.ProgressBarTemplate', {
                                        percentDoneName: 'PointLoad',
                                        calculateColorFn: function(recordData) {
                                            var loadval = recordData.PointLoad;
                                            if (loadval < 0.8) {
                                                colVal = "#B2E3B6"; // Green
                                            } else if (loadval <= 1.0) {
                                                colVal = "#006600"; // Dark Green
                                            } else if (loadval < 1.25) {
                                                colVal = "#FCB5B1"; // Red
                                            } else {
                                                colVal = "#f61509"; // dark Red
                                            }
                                            return colVal;
                                        },
                                        generateLabelTextFn: function(recordData) {
                                          return recordData.PointEstimates + ' / ' + recordData.PointCapacity;
                                        }
                                    })
                                }, {
                                    text: 'Task Est Load',
                                    width: 60,
                                    align: 'center',
                                    xtype: 'templatecolumn',
                                    tpl: Ext.create('Rally.ui.renderer.template.progressbar.ProgressBarTemplate', {
                                        percentDoneName: 'Load',
                                        calculateColorFn: function(recordData) {
                                            var loadval = recordData.Load;
                                            if (loadval < 0.8) {
                                                colVal = "#B2E3B6"; // Green
                                            } else if (loadval <= 1.0) {
                                                colVal = "#006600"; // Dark Green
                                            } else if (loadval < 1.25) {
                                                colVal = "#FCB5B1"; // Red
                                            } else {
                                                colVal = "#f61509"; // dark Red
                                            }
                                            return colVal;
                                        },
                                        generateLabelTextFn: function(recordData) {
                                          return (recordData.TaskEstimates === null ? 0 : recordData.TaskEstimates) + ' / ' + (recordData.Capacity === null ? 0 : recordData.Capacity);
                                        }

                                    })
                                }]
                            });
                            app = this;
                            this.add(this._myGrid);
                        },
                        failure: function() {
                            console.log('capacityStore load promise failure');
                        },
                        scope: this
                    });
                },
                failure: function() {
                    console.log('load promise failure');
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
