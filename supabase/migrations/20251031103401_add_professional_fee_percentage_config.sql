-- Add professional_fee_percentage configuration to admin_configs table
INSERT INTO admin_configs (key, value, description, data_type) 
VALUES ('professional_fee_percentage', '3', 'Percentage fee charged to professionals on completed bookings', 'decimal')
ON CONFLICT (key) DO NOTHING;
