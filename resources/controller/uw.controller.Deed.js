/*
 * This file is part of the MediaWiki extension UploadWizard.
 *
 * UploadWizard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * UploadWizard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with UploadWizard.  If not, see <http://www.gnu.org/licenses/>.
 */

( function ( mw, uw, $, OO ) {
	/**
	 * Deed step controller.
	 *
	 * @class
	 * @extends uw.controller.Step
	 * @param {mw.Api} api
	 * @param {Object} config UploadWizard config object.
	 */
	uw.controller.Deed = function UWControllerDeed( api, config ) {
		uw.controller.Step.call(
			this,
			new uw.ui.Deed(),
			api,
			config
		);

		this.stepName = 'deeds';

		this.deeds = {};
	};

	OO.inheritClass( uw.controller.Deed, uw.controller.Step );

	uw.controller.Deed.prototype.moveNext = function () {
		var
			deedController = this,
			valid, fields;

		if ( !this.deedChooser ) {
			uw.controller.Step.prototype.moveNext.call( this );
			return;
		}

		valid = this.deedChooser.valid();
		if ( valid ) {
			fields = this.deedChooser.deed.getFields();

			// Update any error/warning messages
			fields.forEach( function ( fieldLayout ) {
				fieldLayout.checkValidity();
			} );

			// TODO Handle warnings with a confirmation dialog
			$.when.apply( $, fields.map( function ( fieldLayout ) {
				return fieldLayout.fieldWidget.getErrors();
			} ) ).done( function () {
				var i;
				for ( i = 0; i < arguments.length; i++ ) {
					if ( arguments[ i ].length ) {
						// One of the fields has errors
						return;
					}
				}

				uw.controller.Step.prototype.moveNext.call( deedController );
			} );
		}
	};

	/**
	 * Move to this step.
	 */
	uw.controller.Deed.prototype.load = function ( uploads ) {
		var customDeed, previousDeed, fromStepName,
			showDeed = false,
			step = this;

		$.each( uploads, function ( i, upload ) {
			fromStepName = upload.state;
			if ( !upload.file.fromURL ) {
				showDeed = true;
				return false;
			}
		} );

		uw.controller.Step.prototype.load.call( this, uploads );

		// If all of the uploads are from URLs, then we know the licenses
		// already, we don't need this step.
		if ( !showDeed ) {
			// this is a bit of a hack: when images from flickr are uploaded, we
			// don't get to choose the license anymore, and this step will be
			// skipped ... but we could reach this step from either direction
			if ( fromStepName === 'details' ) {
				this.movePrevious();
			} else {
				this.moveNext();
			}
			return;
		}

		// grab a serialized copy of previous deeds' details (if any)
		if ( this.deedChooser ) {
			previousDeed = this.deedChooser.getSerialized();
		}

		this.deeds = mw.UploadWizard.getLicensingDeeds( this.uploads.length, this.config );

		// if we have multiple uploads, also give them the option to set
		// licenses individually
		if ( this.uploads.length > 1 && this.shouldShowIndividualDeed( this.config ) ) {
			customDeed = $.extend( new mw.UploadWizardDeed(), {
				name: 'custom'
			} );
			this.deeds[ customDeed.name ] = customDeed;
		}

		this.deedChooser = new mw.UploadWizardDeedChooser(
			this.config,
			'#mwe-upwiz-deeds',
			this.deeds,
			this.uploads
		);

		$( '<div>' )
			.insertBefore( this.deedChooser.$selector.find( '.mwe-upwiz-deed-ownwork' ) )
			.msg( 'mwe-upwiz-deeds-macro-prompt', this.uploads.length, mw.user );

		$.each( uploads, function ( i, upload ) {
			// Add previews and details to the DOM
			if ( !upload.file.fromURL ) {
				upload.deedPreview = new uw.ui.DeedPreview( upload, step.config );
			}
		} );

		this.deedChooser.onLayoutReady();

		// restore the previous input (if any) for all deeds
		if ( previousDeed ) {
			this.deedChooser.setSerialized( previousDeed );
		}
	};

	/**
	 * Check whether we should give the user the option to choose licenses for
	 * individual files on the details step.
	 *
	 * @private
	 */
	uw.controller.Deed.prototype.shouldShowIndividualDeed = function ( config ) {
		var ownWork;

		if ( config.licensing.ownWorkDefault === 'choice' ) {
			return true;
		} else if ( config.licensing.ownWorkDefault === 'own' ) {
			ownWork = config.licensing.ownWork;
			return ownWork.licenses.length > 1;
		} else {
			return true; // TODO: might want to have similar behaviour here
		}
	};

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
