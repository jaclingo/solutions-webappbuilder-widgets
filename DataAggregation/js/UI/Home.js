///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define(['dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/Deferred',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/Evented',
  'dojo/text!./templates/Home.html',
  'dojo/on',
  '../csvStore',
  './Addresses',
  './Coordinates',
  './FieldMapping',
  'esri/lang'
],
  function (declare,
    lang,
    array,
    Deferred,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    Evented,
    template,
    on,
    CsvStore,
    Addresses,
    Coordinates,
    FieldMapping,
    esriLang) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
      baseClass: 'cf-home',
      declaredClass: 'CriticalFacilities.Home',
      templateString: template,
      _started: null,
      label: 'Home',
      parent: null,
      nls: null,
      map: null,
      appConfig: null,
      config: null,
      theme: '',
      isDarkTheme: '',
      styleColor: '',
      _geocodeSources: null,
      _fsFields: [],
      _singleFields: [],
      _multiFields: [],
      _childViews: [],

      constructor: function (options) {
        lang.mixin(this, options);
        this._initBaseArgs();
      },

      _initBaseArgs: function () {
        this._baseArgs = {
          nls: this.nls,
          map: this.map,
          parent: this.parent,
          config: this.config,
          appConfig: this.appConfig,
          theme: this.theme,
          isDarkTheme: this.isDarkTheme
        };
      },

      postCreate: function () {
        this.inherited(arguments);
        this.pageInstruction.innerHTML = esriLang.substitute({
          layer: this.parent.editLayer.name
        }, this.nls.startPage.startPageInstructions);
      },

      startup: function () {
        this._started = true;

        this.own(on(this.map.container, "dragenter", this.onDragEnter));
        this.own(on(this.map.container, "dragover", this.onDragOver));
        this.own(on(this.map.container, "drop", lang.hitch(this, this.onDrop)));
        this.own(on(this.fileNode, "change", lang.hitch(this, this.onDrop)));
      },

      onShown: function () {

      },

      _clearResults: function (showInfoWindow) {
        if (!showInfoWindow) {
          this.map.infoWindow.hide();
        }
      },

      clearSearchText: function () {
        if (this._searchInstance && this._searchInstance.search) {
          this._searchInstance.search.clear();
        }
      },

      resetPlaceNameWidgetValues: function () {
        this.clearSearchText();
      },

      setStyleColor: function (styleColor) {
        this.styleColor = styleColor;
      },

      updateImageNodes: function () {
        //TODO toggle white/black images
      },

      updateTheme: function (theme) {
        this.theme = theme;
      },

      validate: function (type, result) {
        var def = new Deferred();
        if (type === 'next-view') {
          def.resolve(this._nextView(result));
        } else if (type === 'back-view') {
          this._backView(result).then(function (v) {
            def.resolve(v);
          });
        }
        return def;
      },

      _nextView: function (nextResult) {
        if (nextResult.navView.label === this.pageContainer.views[1].label) {
          this.pageContainer.toggleController(false);
        }
        return true;
      },

      _backView: function (backResult) {
        var def = new Deferred();
        if (backResult.navView.label === this.label) {
          //for validate
          this.pageContainer.toggleController(true);
          def.resolve(true);
        }
        return def;
      },

      _clearMapping: function () {
        this.parent._locationMappingComplete = false;
        this.parent._fieldMappingComplete = false;
      },

      onDragEnter: function (event) {
        event.preventDefault();
      },

      onDragOver: function (event) {
        event.preventDefault();
      },

      onDrop: function (event) {
        if (this.csvStore) {
          this.csvStore.clear();
        }

        var files;
        if (event.dataTransfer) {
          event.preventDefault();
          files = event.dataTransfer.files;
        } else if (event.currentTarget){
          files = event.currentTarget.files;
        }

        if (files && files.length > 0) {
          var file = files[0];//single file for the moment
          if (file.name.indexOf(".csv") !== -1) {
            this.csvStore = new CsvStore({
              file: file,
              fsFields: this._fsFields,
              map: this.map,
              geocodeSources: this._geocodeSources,
              nls: this.nls,
              appConfig: this.appConfig,
              editLayer: this.parent.editLayer,
              symbol: this.parent._symbol
            });
            this.csvStore.handleCsv().then(lang.hitch(this, function (obj) {
              this._updatePageContainer(obj);
            }));
          }
        }
      },

      _initCoordinatesView: function (obj) {
        return new Coordinates(lang.mixin({
          fields: this._getFields(obj, true),
          xField: this.config.xyFields[0],
          yField: this.config.xyFields[1]
        }, this._baseArgs));
      },

      _initAddressView: function (obj) {
        return new Addresses(lang.mixin({
          singleFields: this._singleFields,
          multiFields: this._multiFields,
          fields: this._getFields(obj, false)
        }, this._baseArgs));
      },

      _initFieldMappingView: function (obj) {
        return new FieldMapping(lang.mixin({
          targetFields: obj.fsFields,
          sourceFields: this._getFields(obj, false)
        }, this._baseArgs));
      },

      _getFields: function (obj, coordFields) {
        //coord fields
        var fields = [];
        array.forEach(obj.fields, function (field) {
          var fieldType = obj.fieldTypes[field];
          var pushField = (coordFields && fieldType && (fieldType.supportsInt || fieldType.supportsFloat)) ?
            true : !coordFields ? true : false;
          if (pushField) {
            fields.push({
              label: field,
              value: field,
              type: fieldType
            });
          }
        });
        return fields;
      },

      _updatePageContainer: function (obj) {
        var startPage = this.pageContainer.getViewByTitle('StartPage');
        startPage.csvStore = this.csvStore;

        var coordinatesView = this._initCoordinatesView(obj);
        this.pageContainer.addView(coordinatesView);

        var addressView = this._initAddressView(obj);
        this.pageContainer.addView(addressView);

        var fieldMappingView = this._initFieldMappingView(obj);
        this.pageContainer.addView(fieldMappingView);

        //go to the next page to start the user workflow
        this.pageContainer._nextView();
      }
    });
  });