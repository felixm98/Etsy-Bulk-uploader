"""
Settings Blueprint - User default settings management

Note: Etsy API credentials are configured as environment variables (ETSY_API_KEY, ETSY_SHARED_SECRET)
since OAuth 2.0 uses a single app credential with per-user access tokens.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db

settings_bp = Blueprint('settings', __name__)


def get_or_create_settings_model():
    """Get or create UserSettings model"""
    from models import db
    
    class UserSettings(db.Model):
        """User-specific default settings for listings"""
        __tablename__ = 'user_settings'
        __table_args__ = {'extend_existing': True}
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
        
        # Default listing settings
        default_price = db.Column(db.Float, default=10.0)
        default_quantity = db.Column(db.Integer, default=999)
        auto_renew = db.Column(db.Boolean, default=True)
        
        def to_dict(self):
            return {
                'default_price': self.default_price,
                'default_quantity': self.default_quantity,
                'auto_renew': self.auto_renew
            }
    
    return UserSettings


@settings_bp.route('/api/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """Get user settings"""
    user_id = get_jwt_identity()
    UserSettings = get_or_create_settings_model()
    
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    
    if not settings:
        # Return defaults
        return jsonify({
            'default_price': 10.0,
            'default_quantity': 999,
            'auto_renew': True
        })
    
    return jsonify(settings.to_dict())


@settings_bp.route('/api/settings', methods=['POST'])
@jwt_required()
def save_settings():
    """Save user settings"""
    user_id = get_jwt_identity()
    data = request.get_json()
    UserSettings = get_or_create_settings_model()
    
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)
    
    # Update default settings
    if 'default_price' in data:
        settings.default_price = data['default_price']
    
    if 'default_quantity' in data:
        settings.default_quantity = data['default_quantity']
    
    if 'auto_renew' in data:
        settings.auto_renew = data['auto_renew']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Settings saved successfully',
        **settings.to_dict()
    })
