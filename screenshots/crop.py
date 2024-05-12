from PIL import Image

# Open the PNG screenshot
image = Image.open("ChangeList.png")

# Get the original image size
original_width, original_height = image.size

# Calculate the new size, keeping the aspect ratio and resizing the width to 1200px
new_width = 1200
new_height = int(new_width * original_height / original_width)

# Resize the image to the new size
resized_image = image.resize((new_width, new_height), resample=Image.LANCZOS)

# Crop the image to the desired size (1200x630), keeping the top part
left = 0
top = 0
right = 1200
bottom = 630
cropped_image = resized_image.crop((left, top, right, bottom))

# Save the cropped image
cropped_image.save("ChangeList_crop.png")
