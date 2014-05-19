(function () {
var Ext = window.Ext4 || window.Ext;
var appAutoScroll = Ext.isIE7 || Ext.isIE8;
var gridAutoScroll = !appAutoScroll;
var app;
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
	items:{ html:'<h1>Goto Track->Team Status Page to enter initial Capacities</h1>'},
	autoScroll: appAutoScroll,

	launch: function () {
		app = this;
		app.iPicker = app.add({
			items: [{
				xtype: 'rallyiterationcombobox',
				limit: Infinity,
				storeConfig: {
					listeners: {
						load: function(store, records){
//							console.log(records);
						}
					}
				},
				listeners: {
					select: function(combobox) {
//						console.log('processing: ' + combobox.getRecord().get("Name"));
						
						app._loadGrid(combobox.getRecord().get("ObjectID"));
					},
					ready: function(combobox) {
						app._loadGrid(combobox.getRecord().get("ObjectID"));
					}
				}    

			}]
		});
	},	
		
	_loadGrid: function (iName) {
		var context = app.getContext();
		pageSize = 25;
		fetch = 'User,Capacity,TaskEstimates';
		columns = app._getColumns(fetch);
		if (app.mygrid) app.mygrid.destroy();
		app.mygrid = app.add({
			xtype: 'rallygrid',
			layout: 'fit',
			columnCfgs: columns,
			enableColumnHide: false,
			showRowActionsColumn: false,
//			enableBulkEdit: context.isFeatureEnabled("EXT4_GRID_BULK_EDIT"),
			enableEditing: true,
			autoScroll: gridAutoScroll,
//			plugins: app._getPlugins(columns),
			context: app.getContext(),
			storeConfig: {
				fetch: fetch,
				model: 'UserIterationCapacity',
				filters: app._getFilters(iName),
				pageSize: pageSize,
//				sorters: Rally.data.util.Sorter.sorters(app.getSetting('order')),
				listeners: {
					load: app._updateAppContainerSize,
					scope: app
				}
			},
			pagingToolbarCfg: {
				pageSizes: [pageSize]
			}
		});
//		console.log('loading grid');
		},

	_getFilters: function (iName) {
		var filters = [];
		filters.push({
			property: 'Iteration.ObjectID',
			operator: '=',
			value: iName
		});
		filters.push({
			property: 'Capacity',
			operator: '>',
			value: 0
		});

// console.log('iName=' + iName);
		return filters;
	},

	_getFetchOnlyFields: function () {
		return ['PercentComplete'];
	},

	_updateAppContainerSize: function (store,data) {
console.log(data);
		if (app.mygrid.appContainer) {
			var grid = app.mygrid.down('rallygrid');
			grid.el.setHeight('auto');
			grid.body.setHeight('auto');
			grid.view.el.setHeight('auto');
			app.setSize({height: grid.getHeight() + _.reduce(grid.getDockedItems(), function (acc, item) {
				return acc + item.getHeight() + item.el.getMargin('tb');
			}, 0)});
			app.appContainer.setPanelHeightToAppHeight();
		}
	},

	_getColumns: function (fetch) {
		if (fetch) {
			return Ext.Array.difference(fetch.split(','), app._getFetchOnlyFields());
		}
		return [];
	}

//	_getPlugins: function (columns) {
//		var plugins = [];
//
//		if (Ext.Array.intersect(columns, ['PercentDone', 'PercentDoneByStoryPlanEstimate', 'PercentDoneByStoryCount']).length > 0) {
//			plugins.push('rallypercentdonepopoverplugin');
//		}
//
//		return plugins;
//	}
});
})();