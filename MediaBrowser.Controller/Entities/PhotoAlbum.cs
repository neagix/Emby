﻿using MediaBrowser.Model.Configuration;
using MediaBrowser.Model.Users;
using System.Linq;
using System.Runtime.Serialization;

namespace MediaBrowser.Controller.Entities
{
    public class PhotoAlbum : Folder
    {
        [IgnoreDataMember]
        public override bool AlwaysScanInternalMetadataPath
        {
            get
            {
                return true;
            }
        }

        protected override bool GetBlockUnratedValue(UserPolicy config)
        {
            return config.BlockUnratedItems.Contains(UnratedItem.Other);
        }
    }
}
